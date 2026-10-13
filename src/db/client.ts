import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const globalParaDb = globalThis as unknown as {
  conexao?: ReturnType<typeof postgres>;
};

export function criarDb(url: string) {
  const sql = postgres(url, { max: 10 });
  return drizzle(sql, { schema });
}

export function obterDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL ausente");
  }
  if (!globalParaDb.conexao) {
    globalParaDb.conexao = postgres(url, { max: 10 });
  }
  return drizzle(globalParaDb.conexao, { schema });
}
