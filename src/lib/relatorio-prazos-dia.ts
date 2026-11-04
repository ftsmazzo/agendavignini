import { asc, eq, inArray, sql } from "drizzle-orm";
import { obterDb } from "@/db/client";
import { audiencias, prazos } from "@/db/schema";
import { dataBr, dataIsoValida } from "@/lib/datas";
import { chaveOpenRouter } from "@/lib/openrouter";
import {
  datasAdicionaisDoTexto,
  numeroDoProcesso,
  partesDaPublicacao,
} from "@/lib/publicacao";
import { extrairPartesRelatorioIa } from "@/lib/relatorio-prazos-dia-ia";

export type LinhaRelatorioPrazosDia = {
  reclamante: string;
  processo: string;
  reclamada: string;
  dataAdicional: string;
  status: string;
};

type CacheDia = {
  em: number;
  linhas: LinhaRelatorioPrazosDia[];
};

const CACHE_MS = 15 * 60 * 1000;
const cacheGlobal = globalThis as typeof globalThis & {
  __relatorioPrazosDiaCache?: Map<string, CacheDia>;
};

function cache() {
  if (!cacheGlobal.__relatorioPrazosDiaCache) {
    cacheGlobal.__relatorioPrazosDiaCache = new Map();
  }
  return cacheGlobal.__relatorioPrazosDiaCache;
}

function statusLimpo(observacao: string | null) {
  return (observacao ?? "").replace(/\s+/g, " ").trim().slice(0, 180);
}

function primeiroPreenchido(...valores: Array<string | null | undefined>) {
  for (const valor of valores) {
    const limpo = (valor ?? "").replace(/\s+/g, " ").trim();
    if (limpo) {
      return limpo;
    }
  }
  return "";
}

function melhorNome(
  preferido: string | null | undefined,
  reserva: string | null | undefined,
) {
  const a = (preferido ?? "").replace(/\s+/g, " ").trim();
  const b = (reserva ?? "").replace(/\s+/g, " ").trim();
  if (a && b) {
    return a.length >= b.length ? a : b;
  }
  return a || b || "";
}

export async function contarPrazosDoDia(dia: string) {
  if (!dataIsoValida(dia)) {
    return 0;
  }
  const db = obterDb();
  const [linha] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(prazos)
    .where(eq(prazos.data, dia));
  return linha?.total ?? 0;
}

export async function linhasRelatorioPrazosDia(
  dia: string,
  opcoes?: { forcar?: boolean },
) {
  if (!dataIsoValida(dia)) {
    return [] as LinhaRelatorioPrazosDia[];
  }

  if (!opcoes?.forcar) {
    const hit = cache().get(dia);
    if (hit && Date.now() - hit.em < CACHE_MS) {
      return hit.linhas;
    }
  }

  const db = obterDb();
  const itens = await db
    .select({
      id: prazos.id,
      data: prazos.data,
      titulo: prazos.titulo,
      observacao: prazos.observacao,
      conteudo: prazos.conteudo,
    })
    .from(prazos)
    .where(eq(prazos.data, dia))
    .orderBy(asc(prazos.id));

  const processos = itens
    .map((item) =>
      numeroDoProcesso(item.conteudo, item.titulo, item.observacao),
    )
    .filter((item): item is string => Boolean(item));

  const cadastro = new Map<
    string,
    { reclamante: string | null; reclamado: string | null }
  >();
  if (processos.length > 0) {
    const unicos = [...new Set(processos)];
    const linhasCadastro = await db
      .select({
        numeroProcesso: audiencias.numeroProcesso,
        reclamante: audiencias.reclamante,
        reclamado: audiencias.reclamado,
      })
      .from(audiencias)
      .where(inArray(audiencias.numeroProcesso, unicos))
      .orderBy(sql`${audiencias.id} desc`);
    for (const linha of linhasCadastro) {
      const numero = numeroDoProcesso(linha.numeroProcesso);
      if (!numero || cadastro.has(numero)) {
        continue;
      }
      cadastro.set(numero, {
        reclamante: linha.reclamante,
        reclamado: linha.reclamado,
      });
    }
  }

  // 1) Base local (publicação + cadastro) — não depende da IA.
  const base = itens.map((item) => {
    const processo =
      numeroDoProcesso(item.conteudo, item.titulo, item.observacao) ?? "";
    const ficha = processo ? cadastro.get(processo) : undefined;
    const regex = partesDaPublicacao(item.conteudo, item.titulo);
    const extras = datasAdicionaisDoTexto(item.conteudo ?? "", item.data)
      .map(dataBr)
      .join("; ");
    return {
      id: item.id,
      item,
      processo,
      reclamante: melhorNome(regex.reclamante, ficha?.reclamante),
      reclamada: melhorNome(regex.reclamada, ficha?.reclamado),
      dataAdicional: extras,
      status: statusLimpo(item.observacao),
    };
  });

  // 2) IA só nos que ainda faltam parte.
  const precisar = new Set(
    base
      .filter((linha) => !linha.reclamante || !linha.reclamada)
      .map((linha) => linha.id),
  );
  const porIa = await extrairPartesRelatorioIa(
    base.map((linha) => linha.item),
    precisar,
  );

  const linhas = base.map((linha): LinhaRelatorioPrazosDia => {
    const ia = porIa.get(linha.id);
    return {
      reclamante: primeiroPreenchido(linha.reclamante, ia?.reclamante),
      processo: linha.processo,
      reclamada: primeiroPreenchido(linha.reclamada, ia?.reclamada),
      dataAdicional: primeiroPreenchido(linha.dataAdicional, ia?.dataAdicional),
      status: linha.status,
    };
  });

  cache().set(dia, { em: Date.now(), linhas });
  return linhas;
}

export function nomeArquivoPrazosDia(dia: string, extensao: "xlsx" | "pdf") {
  return `prazos-${dia}.${extensao}`;
}

export function relatorioUsaIa() {
  return Boolean(chaveOpenRouter());
}
