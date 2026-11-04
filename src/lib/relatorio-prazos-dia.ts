import { asc, eq, inArray, sql } from "drizzle-orm";
import { obterDb } from "@/db/client";
import { audiencias, prazos } from "@/db/schema";
import { dataBr, dataIsoValida } from "@/lib/datas";
import {
  datasAdicionaisDoTexto,
  numeroDoProcesso,
  partesDaPublicacao,
} from "@/lib/publicacao";

export type LinhaRelatorioPrazosDia = {
  reclamante: string;
  processo: string;
  reclamada: string;
  dataAdicional: string;
  status: string;
};

function statusLimpo(observacao: string | null) {
  const texto = (observacao ?? "").replace(/\s+/g, " ").trim();
  if (!texto) {
    return "";
  }
  if (texto.length <= 100) {
    return texto;
  }
  return `${texto.slice(0, 97).trim()}…`;
}

function escolherNome(
  preferido: string | null | undefined,
  reserva: string | null | undefined,
) {
  const a = (preferido ?? "").trim();
  const b = (reserva ?? "").trim();
  if (a && b) {
    // Prefere o nome mais completo (ex.: SYLVAMO DO BRASIL LTDA > SYLVAMO).
    return a.length >= b.length ? a : b;
  }
  return a || b || "";
}

export async function linhasRelatorioPrazosDia(dia: string) {
  if (!dataIsoValida(dia)) {
    return [] as LinhaRelatorioPrazosDia[];
  }

  const db = obterDb();
  const itens = await db
    .select({
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

  return itens.map((item): LinhaRelatorioPrazosDia => {
    // Observação é status/recado — não entra na extração de partes.
    const partes = partesDaPublicacao(item.conteudo, item.titulo);
    const processo =
      numeroDoProcesso(item.conteudo, item.titulo, item.observacao) ?? "";
    const ficha = processo ? cadastro.get(processo) : undefined;
    const extras = datasAdicionaisDoTexto(item.conteudo ?? "", item.data);
    return {
      // Cadastro da audiência é estruturado; a publicação completa o que faltar.
      reclamante: escolherNome(ficha?.reclamante, partes.reclamante),
      processo,
      reclamada: escolherNome(ficha?.reclamado, partes.reclamada),
      dataAdicional: extras.map(dataBr).join("; "),
      status: statusLimpo(item.observacao),
    };
  });
}

export function nomeArquivoPrazosDia(dia: string, extensao: "xlsx" | "pdf") {
  return `prazos-${dia}.${extensao}`;
}
