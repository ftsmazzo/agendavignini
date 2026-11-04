"use server";

import { exigirAdmin } from "@/lib/acesso";
import { dataIsoValida } from "@/lib/datas";
import { linhasRelatorioPrazosDia } from "@/lib/relatorio-prazos-dia";

export async function gerarPrazosDoDia(diaBruto: string) {
  await exigirAdmin();
  const dia = diaBruto.slice(0, 10);
  if (!dataIsoValida(dia)) {
    return { erro: "Escolha um dia válido.", data: "", total: 0, geradoEm: "" };
  }
  const linhas = await linhasRelatorioPrazosDia(dia);
  return {
    erro: "",
    data: dia,
    total: linhas.length,
    geradoEm: new Date().toISOString(),
  };
}
