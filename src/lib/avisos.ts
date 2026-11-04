import { and, desc, eq, ne, sql } from "drizzle-orm";
import { obterDb } from "@/db/client";
import { notificacoes, prazos, usuarios } from "@/db/schema";
import { numeroDoProcesso } from "@/lib/publicacao";

/** Conta que recebe todos os avisos de mudança de data. */
export const LOGIN_DESTINO_AVISOS = "Jonathas";

export async function idDestinoAvisos() {
  const db = obterDb();
  const [pessoa] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(
      and(eq(usuarios.login, LOGIN_DESTINO_AVISOS), eq(usuarios.ativo, true)),
    )
    .limit(1);
  return pessoa?.id ?? null;
}

export function linhasDeAviso(entrada: {
  prazoId: number;
  titulo: string;
  dataAnterior: string;
  dataNova: string;
  destinatarioId: number | null;
  atorId: number;
}) {
  if (!entrada.destinatarioId || entrada.dataAnterior === entrada.dataNova) {
    return [];
  }
  return [
    {
      usuarioId: entrada.destinatarioId,
      prazoId: entrada.prazoId,
      titulo: entrada.titulo.slice(0, 180),
      dataAnterior: entrada.dataAnterior,
      dataNova: entrada.dataNova,
      atorId: entrada.atorId,
    },
  ];
}

/** Apaga da fila dos demais usuários avisos ainda não lidos. */
export async function limparAvisosForaDoDestino(destinoId: number) {
  const db = obterDb();
  await db
    .update(notificacoes)
    .set({ lida: true })
    .where(
      and(ne(notificacoes.usuarioId, destinoId), eq(notificacoes.lida, false)),
    );
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

/** Abre o prazo no dia em que ele está, com destaque no cartão. */
export function caminhoDoPrazo(prazoId: number, data: string) {
  return `/prazos?data=${data}&id=${prazoId}`;
}

export async function listarAvisos(usuarioId: number) {
  const db = obterDb();
  const linhas = await db
    .select({
      id: notificacoes.id,
      titulo: notificacoes.titulo,
      dataAnterior: notificacoes.dataAnterior,
      dataNova: notificacoes.dataNova,
      lida: notificacoes.lida,
      criadaEm: notificacoes.criadaEm,
      prazoId: notificacoes.prazoId,
      prazoData: prazos.data,
      prazoTitulo: prazos.titulo,
      prazoObservacao: prazos.observacao,
      prazoConteudo: prazos.conteudo,
      atorNome: usuarios.nome,
      atorSobrenome: usuarios.sobrenome,
    })
    .from(notificacoes)
    .leftJoin(usuarios, eq(usuarios.id, notificacoes.atorId))
    .leftJoin(prazos, eq(prazos.id, notificacoes.prazoId))
    .where(eq(notificacoes.usuarioId, usuarioId))
    .orderBy(desc(notificacoes.criadaEm), desc(notificacoes.id))
    .limit(40);

  return linhas.map((item) => {
    const dataAlvo = item.prazoData ?? item.dataNova;
    const processo = numeroDoProcesso(
      item.prazoTitulo,
      item.prazoObservacao,
      item.prazoConteudo,
      item.titulo,
    );
    return {
      id: item.id,
      titulo: item.titulo,
      dataAnterior: item.dataAnterior,
      dataNova: item.dataNova,
      lida: item.lida,
      criadaEm: item.criadaEm,
      prazoId: item.prazoId,
      processo,
      caminho:
        item.prazoId && dataAlvo
          ? caminhoDoPrazo(item.prazoId, dataAlvo)
          : null,
      atorNome: item.atorNome,
      atorSobrenome: item.atorSobrenome,
    };
  });
}
