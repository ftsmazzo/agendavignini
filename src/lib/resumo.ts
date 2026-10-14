import { and, asc, eq, sql } from "drizzle-orm";
import { obterDb } from "@/db/client";
import {
  audiencias,
  audienciasUsuarios,
  prazos,
  prazosUsuarios,
  usuarios,
} from "@/db/schema";
import { dataBr, dataHoraBr } from "@/lib/datas";

const areas = {
  administrativo: "Administrativo",
  civil: "Cível",
  trabalhista: "Trabalhista",
} as const;

type AudienciaDoDia = {
  id: number;
  numeroProcesso: string;
  vara: string;
  local: string;
  reclamante: string | null;
  reclamado: string | null;
  preposto: string | null;
  dataHora: Date;
  observacao: string | null;
};

export type PrazoDoDia = {
  id: number;
  area: keyof typeof areas;
  data: string;
  titulo: string;
  conteudo: string;
  situacao: "aberto" | "cumprido";
  cumpridoPor: string | null;
  cumpridoEm: Date | null;
};

export type ResumoDia = {
  audiencias: AudienciaDoDia[];
  prazos: PrazoDoDia[];
};

export function assuntoDoDia(dia: string) {
  return `Prazos e Audiências para ${dataBr(dia)} - Agenda Coelho Vignini`;
}

export function statusDoPrazo(item: {
  situacao: PrazoDoDia["situacao"];
  cumpridoPor: string | null;
  cumpridoEm: Date | null;
}) {
  if (item.situacao !== "cumprido") {
    return "Não cumprido";
  }
  if (item.cumpridoPor && item.cumpridoEm) {
    return `Cumprido por ${item.cumpridoPor} em ${dataHoraBr(item.cumpridoEm)}`;
  }
  if (item.cumpridoPor) {
    return `Cumprido por ${item.cumpridoPor}`;
  }
  return "Cumprido";
}

const FAIXA = {
  administrativo: "border-l-4 border-area-admin",
  civil: "border-l-4 border-area-civil",
  trabalhista: "border-l-4 border-area-trab",
} as const;

export function rotuloArea(area: keyof typeof areas) {
  return areas[area];
}

export function faixaDaArea(area: keyof typeof areas) {
  return FAIXA[area];
}

function carimbo(agora: Date) {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora);
  const pegar = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${pegar("day")}/${pegar("month")}/${pegar("year")} ${pegar("hour")}:${pegar("minute")}:${pegar("second")}`;
}

export function textoDoResumo(
  nome: string,
  resumo: ResumoDia,
  agora = new Date(),
) {
  const blocos = [
    `Olá, ${nome}.`,
    "",
    "Este é um e-mail informativo com as suas audiências e os prazos para cumprir.",
    "Por favor não responda este e-mail.",
  ];

  if (resumo.audiencias.length > 0) {
    blocos.push("", `Audiências (${resumo.audiencias.length}):`);
    for (const item of resumo.audiencias) {
      blocos.push(
        "",
        "--------------------------------------------------",
        `Num. Processo: ${item.numeroProcesso}`,
        `Vara:          ${item.vara}`,
        `Local:         ${item.local}`,
        `Reclamante:    ${item.reclamante ?? ""}`,
        `Reclamado:     ${item.reclamado ?? ""}`,
        `Preposto:      ${item.preposto ?? ""}`,
        `Data e hora:   ${dataHoraBr(item.dataHora)}`,
        "",
        "Observacao:",
        item.observacao ?? "",
        "--------------------------------------------------",
      );
    }
  }

  if (resumo.prazos.length > 0) {
    blocos.push("", `Prazos (${resumo.prazos.length}):`);
    for (const item of resumo.prazos) {
      blocos.push(
        "",
        "--------------------------------------------------",
        `Tipo:   ${rotuloArea(item.area)}`,
        `Data:   ${dataBr(item.data)}`,
        `Prazo:  ${item.titulo}`,
        `Status: ${statusDoPrazo(item)}`,
        "",
        "Conteúdo:",
        item.conteudo,
        "--------------------------------------------------",
      );
    }
  }

  blocos.push(
    "",
    `Este e-mail foi gerado automaticamente pelo sistema em ${carimbo(agora)}.`,
  );
  return blocos.join("\n");
}

export async function resumoDoDia(
  usuarioId: number,
  dia: string,
): Promise<ResumoDia> {
  const db = obterDb();
  const audienciasDia = await db
    .select({
      id: audiencias.id,
      numeroProcesso: audiencias.numeroProcesso,
      vara: audiencias.vara,
      local: audiencias.local,
      reclamante: audiencias.reclamante,
      reclamado: audiencias.reclamado,
      preposto: audiencias.preposto,
      dataHora: audiencias.dataHora,
      observacao: audiencias.observacao,
    })
    .from(audienciasUsuarios)
    .innerJoin(audiencias, eq(audiencias.id, audienciasUsuarios.audienciaId))
    .where(
      and(
        eq(audienciasUsuarios.usuarioId, usuarioId),
        sql`(${audiencias.dataHora} at time zone 'America/Sao_Paulo')::date = ${dia}::date`,
      ),
    )
    .orderBy(asc(audiencias.dataHora), asc(audiencias.id));

  const prazosDia = await db
    .select({
      id: prazos.id,
      area: prazos.area,
      data: prazos.data,
      titulo: prazos.titulo,
      conteudo: prazos.conteudo,
      situacao: prazos.situacao,
      cumpridoNome: usuarios.nome,
      cumpridoSobrenome: usuarios.sobrenome,
      cumpridoEm: prazos.cumpridoEm,
    })
    .from(prazosUsuarios)
    .innerJoin(prazos, eq(prazos.id, prazosUsuarios.prazoId))
    .leftJoin(usuarios, eq(usuarios.id, prazos.cumpridoPorId))
    .where(and(eq(prazosUsuarios.usuarioId, usuarioId), eq(prazos.data, dia)))
    .orderBy(asc(prazos.id));

  return {
    audiencias: audienciasDia,
    prazos: prazosDia.map((item) => ({
      id: item.id,
      area: item.area,
      data: item.data,
      titulo: item.titulo,
      conteudo: item.conteudo,
      situacao: item.situacao,
      cumpridoPor: item.cumpridoNome
        ? `${item.cumpridoNome} ${item.cumpridoSobrenome ?? ""}`.trim()
        : null,
      cumpridoEm: item.cumpridoEm,
    })),
  };
}

export async function filaDoDia(dia: string) {
  const db = obterDb();
  const pessoas = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      sobrenome: usuarios.sobrenome,
      email: usuarios.email,
    })
    .from(usuarios)
    .where(eq(usuarios.ativo, true))
    .orderBy(asc(usuarios.nome), asc(usuarios.sobrenome));

  const fila: Array<{
    email: string;
    nome: string;
    resumo: ResumoDia;
  }> = [];

  for (const pessoa of pessoas) {
    const email = pessoa.email?.trim() ?? "";
    if (!email) {
      continue;
    }
    const resumo = await resumoDoDia(pessoa.id, dia);
    if (resumo.audiencias.length === 0 && resumo.prazos.length === 0) {
      continue;
    }
    fila.push({
      email,
      nome: `${pessoa.nome} ${pessoa.sobrenome}`.trim(),
      resumo,
    });
  }

  return fila;
}
