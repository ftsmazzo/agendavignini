import { and, desc, eq, sql } from "drizzle-orm";
import { obterDb } from "@/db/client";
import { notificacoes } from "@/db/schema";

export function linhasDeAviso(entrada: {
  prazoId: number;
  titulo: string;
  dataAnterior: string;
  dataNova: string;
  advogados: number[];
  atorId: number;
}) {
  if (entrada.dataAnterior === entrada.dataNova) {
    return [];
  }
  const titulo = entrada.titulo.slice(0, 180);
  return [...new Set(entrada.advogados)].map((usuarioId) => ({
    usuarioId,
    prazoId: entrada.prazoId,
    titulo,
    dataAnterior: entrada.dataAnterior,
    dataNova: entrada.dataNova,
    atorId: entrada.atorId,
  }));
}

export async function contarAvisosNaoLidos(usuarioId: number) {
  const db = obterDb();
  const [linha] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(notificacoes)
    .where(
      and(eq(notificacoes.usuarioId, usuarioId), eq(notificacoes.lida, false)),
    );
  return linha?.total ?? 0;
}

export async function listarAvisos(usuarioId: number) {
  const db = obterDb();
  return db
    .select({
      id: notificacoes.id,
      titulo: notificacoes.titulo,
      dataAnterior: notificacoes.dataAnterior,
      dataNova: notificacoes.dataNova,
      lida: notificacoes.lida,
      criadaEm: notificacoes.criadaEm,
      prazoId: notificacoes.prazoId,
    })
    .from(notificacoes)
    .where(eq(notificacoes.usuarioId, usuarioId))
    .orderBy(desc(notificacoes.criadaEm), desc(notificacoes.id))
    .limit(40);
}
