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

export async function linhasRelatorioPrazosDia(dia: string) {
  if (!dataIsoValida(dia)) {
    return [] as LinhaRelatorioPrazosDia[];
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
    const linhas = await db
      .select({
        numeroProcesso: audiencias.numeroProcesso,
        reclamante: audiencias.reclamante,
        reclamado: audiencias.reclamado,
      })
      .from(audiencias)
      .where(inArray(audiencias.numeroProcesso, unicos))
      .orderBy(sql`${audiencias.id} desc`);
    for (const linha of linhas) {
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

  const porIa = await extrairPartesRelatorioIa(itens);

  return itens.map((item): LinhaRelatorioPrazosDia => {
    const processo =
      numeroDoProcesso(item.conteudo, item.titulo, item.observacao) ?? "";
    const ficha = processo ? cadastro.get(processo) : undefined;
    const ia = porIa.get(item.id);
    const regex = partesDaPublicacao(item.conteudo, item.titulo);
    const extrasRegex = datasAdicionaisDoTexto(item.conteudo ?? "", item.data)
      .map(dataBr)
      .join("; ");

    return {
      reclamante: primeiroPreenchido(
        ia?.reclamante,
        ficha?.reclamante,
        regex.reclamante,
      ),
      processo,
      reclamada: primeiroPreenchido(
        ia?.reclamada,
        ficha?.reclamado,
        regex.reclamada,
      ),
      dataAdicional: primeiroPreenchido(ia?.dataAdicional, extrasRegex),
      status: statusLimpo(item.observacao),
    };
  });
}

export function nomeArquivoPrazosDia(dia: string, extensao: "xlsx" | "pdf") {
  return `prazos-${dia}.${extensao}`;
}

export function relatorioUsaIa() {
  return Boolean(chaveOpenRouter());
}
