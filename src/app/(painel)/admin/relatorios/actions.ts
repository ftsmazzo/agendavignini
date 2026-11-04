"use server";

import { exigirAdmin } from "@/lib/acesso";
import { dataIsoValida } from "@/lib/datas";
import {
  contarPrazosDoDia,
  linhasRelatorioPrazosDia,
} from "@/lib/relatorio-prazos-dia";

export async function gerarPrazosDoDia(diaBruto: string) {
  await exigirAdmin();
  const dia = diaBruto.slice(0, 10);
  if (!dataIsoValida(dia)) {
    return { erro: "Escolha um dia válido.", data: "", total: 0, geradoEm: "" };
  }
  // Conta rápido; a extração (local + IA) roda no primeiro download e fica em cache.
  const total = await contarPrazosDoDia(dia);
  return {
    erro: "",
    data: dia,
    total,
    geradoEm: new Date().toISOString(),
  };
}

/** Pré-aquece o cache do dia (opcional, ao clicar em Gerar com IA). */
export async function prepararPrazosDoDia(diaBruto: string) {
  await exigirAdmin();
  const dia = diaBruto.slice(0, 10);
  if (!dataIsoValida(dia)) {
    return { erro: "Escolha um dia válido.", total: 0 };
  }
  const linhas = await linhasRelatorioPrazosDia(dia, { forcar: true });
  return { erro: "", total: linhas.length };
}
