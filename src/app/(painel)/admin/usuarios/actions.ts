"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterDb } from "@/db/client";
import { auditoria, usuarios } from "@/db/schema";
import { exigirAdmin } from "@/lib/acesso";
import { gerarArgon2id } from "@/lib/senha";

function texto(formData: FormData, nome: string, limite: number) {
  return String(formData.get(nome) ?? "")
    .replaceAll("\u0000", "")
    .trim()
    .slice(0, limite);
}

function ehVinculo(erro: unknown) {
  const atual = erro as { code?: string; cause?: { code?: string } };
  return atual.code === "23503" || atual.cause?.code === "23503";
}

export async function salvarUsuario(
  _estado: { erro: string },
  formData: FormData,
): Promise<{ erro: string }> {
  const ator = await exigirAdmin();
  const nome = texto(formData, "nome", 80);
  const sobrenome = texto(formData, "sobrenome", 80);
  const email = texto(formData, "email", 200);
  const celular = texto(formData, "celular", 40);
  const login = texto(formData, "login", 40);
  const senha = String(formData.get("senha") ?? "");
  const ativo = texto(formData, "ativo", 1) !== "0";
  const entraNoRelatorio = texto(formData, "relatorio", 1) === "1";
  const papel = texto(formData, "papel", 10) === "admin" ? "admin" : "usuario";
  const idBruto = texto(formData, "id", 12);
  const id = idBruto ? Number(idBruto) : null;

  if (!nome) {
    return { erro: "Informe o nome." };
  }
  if (!login) {
    return { erro: "Informe o usuário." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { erro: "O e-mail não parece válido." };
  }
  if (id === ator.id && (!ativo || papel !== "admin")) {
    return { erro: "O seu próprio acesso de administrador permanece ativo." };
  }
  if ((!id && senha.length < 8) || (senha && senha.length < 8)) {
    return { erro: "A senha nova precisa ter pelo menos 8 caracteres." };
  }

  const db = obterDb();
  const repetido = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(sql`lower(${usuarios.login}) = ${login.toLowerCase()}`);
  if (repetido.some((item) => item.id !== id)) {
    return { erro: "Esse usuário já existe." };
  }

  const dados = {
    nome,
    sobrenome,
    email: email || null,
    celular: celular || null,
    login,
    ativo,
    entraNoRelatorio,
    papel: papel as "admin" | "usuario",
  };

  if (id) {
    if (!Number.isInteger(id) || id <= 0) {
      return { erro: "Essa pessoa não está mais na lista." };
    }
    const atualizado = await db
      .update(usuarios)
      .set(dados)
      .where(eq(usuarios.id, id))
      .returning({ id: usuarios.id });
    if (atualizado.length === 0) {
      return { erro: "Essa pessoa não está mais na lista." };
    }
    if (senha) {
      await db
        .update(usuarios)
        .set({
          senhaHash: await gerarArgon2id(senha),
          algoritmoSenha: "argon2id",
        })
        .where(eq(usuarios.id, id));
    }
    await db.insert(auditoria).values({
      atorId: ator.id,
      acao: senha ? "atualizar_senha" : "atualizar",
      entidade: "usuarios",
      entidadeId: String(id),
      detalhe: login,
    });
    revalidatePath("/admin/usuarios");
    revalidatePath("/", "layout");
    redirect(`/admin/usuarios/${id}?salvo=1`);
  }

  const [criado] = await db
    .insert(usuarios)
    .values({
      ...dados,
      senhaHash: await gerarArgon2id(senha),
      algoritmoSenha: "argon2id",
    })
    .returning({ id: usuarios.id });
  if (!criado) {
    return { erro: "Não foi possível salvar o usuário." };
  }
  await db.insert(auditoria).values({
    atorId: ator.id,
    acao: "criar",
    entidade: "usuarios",
    entidadeId: String(criado.id),
    detalhe: login,
  });
  revalidatePath("/admin/usuarios");
  redirect(`/admin/usuarios/${criado.id}?salvo=1`);
}

export async function excluirUsuario(formData: FormData) {
  const ator = await exigirAdmin();
  const id = Number(String(formData.get("id") ?? ""));
  if (!Number.isInteger(id) || id <= 0) {
    redirect("/admin/usuarios");
  }
  if (id === ator.id) {
    redirect(`/admin/usuarios/${id}?erro=proprio`);
  }
  const db = obterDb();
  try {
    const apagado = await db
      .delete(usuarios)
      .where(eq(usuarios.id, id))
      .returning({ id: usuarios.id, login: usuarios.login });
    if (apagado[0]) {
      await db.insert(auditoria).values({
        atorId: ator.id,
        acao: "excluir",
        entidade: "usuarios",
        entidadeId: String(id),
        detalhe: apagado[0].login,
      });
    }
  } catch (erro) {
    if (ehVinculo(erro)) {
      redirect(`/admin/usuarios/${id}?erro=vinculo`);
    }
    throw erro;
  }
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios?excluido=1");
}
