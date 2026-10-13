import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

export function criarDb(url: string) {
  const sql = postgres(url, { max: 10 });
  return drizzle(sql, { schema });
}
