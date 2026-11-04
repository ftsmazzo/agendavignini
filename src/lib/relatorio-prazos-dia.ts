import { asc, eq } from "drizzle-orm";
import { obterDb } from "@/db/client";
import { prazos } from "@/db/schema";
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

  return itens.map((item): LinhaRelatorioPrazosDia => {
    const partes = partesDaPublicacao(
      item.titulo,
      item.observacao,
      item.conteudo,
    );
    const processo =
      numeroDoProcesso(item.titulo, item.observacao, item.conteudo) ?? "";
    const extras = datasAdicionaisDoTexto(
      [item.titulo, item.observacao, item.conteudo].filter(Boolean).join("\n"),
      item.data,
    );
    return {
      reclamante: partes.reclamante ?? "",
      processo,
      reclamada: partes.reclamada ?? "",
      dataAdicional: extras.map(dataBr).join("; "),
      status: (item.observacao ?? "").replace(/\s+/g, " ").trim(),
    };
  });
}

export function nomeArquivoPrazosDia(dia: string, extensao: "xlsx" | "pdf") {
  return `prazos-${dia}.${extensao}`;
}
