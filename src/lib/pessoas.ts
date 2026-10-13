import { asc } from "drizzle-orm";
import { obterDb } from "@/db/client";
import { usuarios } from "@/db/schema";

export async function listarPessoas() {
  const db = obterDb();
  const linhas = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      sobrenome: usuarios.sobrenome,
      ativo: usuarios.ativo,
    })
    .from(usuarios)
    .orderBy(asc(usuarios.nome), asc(usuarios.sobrenome));

  return linhas.map((linha) => ({
    id: linha.id,
    nome: `${linha.nome} ${linha.sobrenome}`.trim(),
    ativo: linha.ativo,
  }));
}
