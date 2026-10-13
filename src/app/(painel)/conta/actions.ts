"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { obterDb } from "@/db/client";
import { auditoria, usuarios } from "@/db/schema";
import { exigirUsuario } from "@/lib/acesso";
import { argonConfere, gerarArgon2id, md5Confere } from "@/lib/senha";

function texto(formData: FormData, nome: string, limite: number) {
  return String(formData.get(nome) ?? "")
    .replaceAll("\u0000", "")
    .trim()
    .slice(0, limite);
}

export async function salvarDados(
  _estado: { erro: string; ok: string },
  formData: FormData,
) {
  const sessao = await exigirUsuario();
  const nome = texto(formData, "nome", 80);
  const sobrenome = texto(formData, "sobrenome", 80);
  const email = texto(formData, "email", 200);
  const celular = texto(formData, "celular", 40);
  const login = texto(formData, "login", 40);
  if (!nome) {
    return { erro: "Informe o nome.", ok: "" };
  }
  if (!login) {
    return { erro: "Informe o usuário.", ok: "" };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { erro: "O e-mail não parece válido.", ok: "" };
  }

  const db = obterDb();
  const repetido = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(sql`lower(${usuarios.login}) = ${login.toLowerCase()}`);
  if (repetido.some((item) => item.id !== sessao.id)) {
    return { erro: "Esse usuário já existe.", ok: "" };
  }

  await db
    .update(usuarios)
    .set({
      nome,
      sobrenome,
      email: email || null,
      celular: celular || null,
      login,
    })
    .where(eq(usuarios.id, sessao.id));
  await db.insert(auditoria).values({
    atorId: sessao.id,
    acao: "atualizar",
    entidade: "usuarios",
    entidadeId: String(sessao.id),
    detalhe: "dados da própria conta",
  });
  revalidatePath("/", "layout");
  return { erro: "", ok: "Dados atualizados." };
}

export async function salvarSenha(
  _estado: { erro: string; ok: string },
  formData: FormData,
) {
  const sessao = await exigirUsuario();
  const atual = String(formData.get("senhaAtual") ?? "");
  const nova = String(formData.get("senhaNova") ?? "");
  const repete = String(formData.get("senhaRepete") ?? "");
  if (nova.length < 8) {
    return {
      erro: "A senha nova precisa ter pelo menos 8 caracteres.",
      ok: "",
    };
  }
  if (nova !== repete) {
    return { erro: "As senhas informadas não são iguais.", ok: "" };
  }

  const db = obterDb();
  const [usuario] = await db
    .select({
      senhaHash: usuarios.senhaHash,
      algoritmoSenha: usuarios.algoritmoSenha,
    })
    .from(usuarios)
    .where(eq(usuarios.id, sessao.id))
    .limit(1);
  if (!usuario) {
    return { erro: "Não foi possível confirmar a senha atual.", ok: "" };
  }
  const confere =
    usuario.algoritmoSenha === "md5"
      ? md5Confere(atual, usuario.senhaHash)
      : await argonConfere(atual, usuario.senhaHash);
  if (!confere) {
    return { erro: "A senha atual está incorreta.", ok: "" };
  }

  await db
    .update(usuarios)
    .set({
      senhaHash: await gerarArgon2id(nova),
      algoritmoSenha: "argon2id",
    })
    .where(eq(usuarios.id, sessao.id));
  await db.insert(auditoria).values({
    atorId: sessao.id,
    acao: "atualizar_senha",
    entidade: "usuarios",
    entidadeId: String(sessao.id),
    detalhe: "senha da própria conta",
  });
  return { erro: "", ok: "Senha atualizada." };
}
