import { sql } from "drizzle-orm";
import { obterDb } from "@/db/client";
import { auditoria, usuarios } from "@/db/schema";
import { argonConfere, gerarArgon2id, md5Confere } from "@/lib/senha";
import { gravarSessao } from "@/lib/sessao";

export async function autenticar(loginInformado: string, senha: string) {
  const login = loginInformado.trim();
  if (!login || !senha) {
    return false;
  }

  const db = obterDb();
  const linhas = await db
    .select({
      id: usuarios.id,
      login: usuarios.login,
      senhaHash: usuarios.senhaHash,
      algoritmoSenha: usuarios.algoritmoSenha,
      ativo: usuarios.ativo,
    })
    .from(usuarios)
    .where(sql`lower(${usuarios.login}) = ${login.toLowerCase()}`);

  const encontrado =
    linhas.find((item) => item.login === login && item.ativo) ??
    linhas.find((item) => item.ativo);

  if (!encontrado) {
    return false;
  }

  const confere =
    encontrado.algoritmoSenha === "md5"
      ? md5Confere(senha, encontrado.senhaHash)
      : await argonConfere(senha, encontrado.senhaHash);

  if (!confere) {
    return false;
  }

  if (encontrado.algoritmoSenha === "md5") {
    const novoHash = await gerarArgon2id(senha);
    await db
      .update(usuarios)
      .set({ senhaHash: novoHash, algoritmoSenha: "argon2id" })
      .where(sql`${usuarios.id} = ${encontrado.id}`);
    await db.insert(auditoria).values({
      atorId: encontrado.id,
      acao: "rehash",
      entidade: "usuarios",
      entidadeId: String(encontrado.id),
      detalhe: "Senha MD5 substituída por Argon2id",
    });
  }

  await gravarSessao(encontrado.id);
  return true;
}
