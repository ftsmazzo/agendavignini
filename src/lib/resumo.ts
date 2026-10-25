import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { obterDb } from "@/db/client";
import {
  audiencias,
  audienciasUsuarios,
  prazos,
  prazosUsuarios,
  usuarios,
} from "@/db/schema";
import { dataBr, dataHoraBr, somarDias } from "@/lib/datas";

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
  tipo: string;
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
  administrativo: "prazo-admin",
  civil: "prazo-civil",
  trabalhista: "prazo-trab",
} as const;

export function marcaDoPrazo(
  situacao: "aberto" | "cumprido",
  data: string,
  hoje: string,
) {
  if (situacao === "cumprido") {
    return { tom: "verde" as const, texto: "Cumprido" };
  }
  if (data < hoje) {
    return { tom: "vermelho" as const, texto: "Vencido" };
  }
  if (data <= somarDias(hoje, 2)) {
    return {
      tom: "amarelo" as const,
      texto: data === hoje ? "Vence hoje" : "Perto",
    };
  }
  return { tom: "verde" as const, texto: "No prazo" };
}

export function rotuloArea(area: keyof typeof areas) {
  return areas[area];
}

export function faixaDaArea(
  area: keyof typeof areas,
  situacao?: "aberto" | "cumprido",
  defesa?: boolean,
) {
  if (situacao === "cumprido") {
    return "prazo-cumprido";
  }
  if (defesa) {
    return "prazo-defesa";
  }
  return FAIXA[area];
}

function tituloIndicaDefesa(titulo: string) {
  return /\bdefesas?\b/i.test(titulo);
}

export function prazoEhDefesa(marcado: boolean, titulo: string) {
  return marcado || tituloIndicaDefesa(titulo);
}

export function filtroDefesa() {
  return sql`(${prazos.defesa} = true or ${prazos.titulo} ~* '\\mdefesas?\\M')`;
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
        `Tipo:          ${item.tipo === "pericia" ? "Perícia" : "Audiência"}`,
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
      tipo: audiencias.tipo,
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

type PainelPeriodo = {
  total: number;
  vencidos: number;
  porCumprir: number;
  cumpridos: number;
  audiencias: number;
  semAdvogado: number;
  areas: Array<{
    area: keyof typeof areas;
    total: number;
    abertos: number;
  }>;
  pessoas: Array<{ id: number; nome: string; total: number }>;
  dias: Array<{ data: string; total: number; abertos: number }>;
};

function filtroDoAdvogado(advogadoId: number | null) {
  if (advogadoId === null) {
    return undefined;
  }
  if (advogadoId === 0) {
    return sql`not exists (select 1 from prazos_usuarios where prazo_id = ${prazos.id})`;
  }
  return sql`(
    ${prazos.cumpridoPorId} = ${advogadoId}
    or exists (
      select 1 from prazos_usuarios
      where prazo_id = ${prazos.id} and usuario_id = ${advogadoId}
    )
  )`;
}

function filtroDaAudiencia(advogadoId: number | null) {
  if (advogadoId === null) {
    return undefined;
  }
  if (advogadoId === 0) {
    return sql`not exists (select 1 from audiencias_usuarios where audiencia_id = ${audiencias.id})`;
  }
  return sql`exists (
    select 1 from audiencias_usuarios
    where audiencia_id = ${audiencias.id} and usuario_id = ${advogadoId}
  )`;
}

export async function painelDoPeriodo(
  inicio: string,
  fim: string,
  hoje: string,
  advogadoId: number | null,
) {
  const db = obterDb();
  const filtro = filtroDoAdvogado(advogadoId);
  const linhas = await db
    .select({
      data: prazos.data,
      area: prazos.area,
      situacao: prazos.situacao,
      total: sql<number>`count(*)::int`,
    })
    .from(prazos)
    .where(and(gte(prazos.data, inicio), lte(prazos.data, fim), filtro))
    .groupBy(prazos.data, prazos.area, prazos.situacao);

  const diaAudiencia = sql`(${audiencias.dataHora} at time zone 'America/Sao_Paulo')::date`;
  const [contaAudiencias] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(audiencias)
    .where(
      and(
        sql`${diaAudiencia} >= ${inicio}::date`,
        sql`${diaAudiencia} <= ${fim}::date`,
        filtroDaAudiencia(advogadoId),
      ),
    );

  const [semMarcacao] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(prazos)
    .where(
      and(
        gte(prazos.data, inicio),
        lte(prazos.data, fim),
        sql`not exists (select 1 from prazos_usuarios where prazo_id = ${prazos.id})`,
        advogadoId && advogadoId > 0 ? sql`false` : undefined,
      ),
    );

  const pessoas =
    advogadoId === null
      ? await db
          .select({
            id: usuarios.id,
            nome: usuarios.nome,
            sobrenome: usuarios.sobrenome,
            total: sql<number>`count(distinct ${prazos.id})::int`,
          })
          .from(usuarios)
          .innerJoin(
            prazos,
            and(
              gte(prazos.data, inicio),
              lte(prazos.data, fim),
              sql`(
                ${prazos.cumpridoPorId} = ${usuarios.id}
                or exists (
                  select 1 from prazos_usuarios
                  where prazo_id = ${prazos.id} and usuario_id = ${usuarios.id}
                )
              )`,
            ),
          )
          .where(eq(usuarios.ativo, true))
          .groupBy(usuarios.id, usuarios.nome, usuarios.sobrenome)
      : [];

  const areas: PainelPeriodo["areas"] = [
    { area: "administrativo", total: 0, abertos: 0 },
    { area: "civil", total: 0, abertos: 0 },
    { area: "trabalhista", total: 0, abertos: 0 },
  ];
  const porDia = new Map<string, { total: number; abertos: number }>();
  let total = 0;
  let vencidos = 0;
  let porCumprir = 0;
  let cumpridos = 0;

  for (const linha of linhas) {
    const area = areas.find((item) => item.area === linha.area);
    if (area) {
      area.total += linha.total;
      if (linha.situacao === "aberto") {
        area.abertos += linha.total;
      }
    }
    const dia = porDia.get(linha.data) ?? { total: 0, abertos: 0 };
    dia.total += linha.total;
    total += linha.total;
    if (linha.situacao === "cumprido") {
      cumpridos += linha.total;
    } else if (linha.data < hoje) {
      vencidos += linha.total;
      dia.abertos += linha.total;
    } else {
      porCumprir += linha.total;
      dia.abertos += linha.total;
    }
    porDia.set(linha.data, dia);
  }

  return {
    total,
    vencidos,
    porCumprir,
    cumpridos,
    audiencias: contaAudiencias?.total ?? 0,
    semAdvogado: advogadoId && advogadoId > 0 ? 0 : (semMarcacao?.total ?? 0),
    areas,
    pessoas: pessoas
      .map((pessoa) => ({
        id: pessoa.id,
        nome: `${pessoa.nome} ${pessoa.sobrenome}`.trim(),
        total: pessoa.total,
      }))
      .sort(
        (a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"),
      ),
    dias: [...porDia.entries()]
      .map(([data, conta]) => ({ data, ...conta }))
      .sort((a, b) => a.data.localeCompare(b.data)),
  } satisfies PainelPeriodo;
}

export async function itensDoDia(dia: string, advogadoId: number | null) {
  const db = obterDb();
  const filtro = filtroDoAdvogado(advogadoId);
  const diaAudiencia = sql`(${audiencias.dataHora} at time zone 'America/Sao_Paulo')::date`;
  const [prazosDia, audienciasDia] = await Promise.all([
    db
      .select({
        id: prazos.id,
        area: prazos.area,
        data: prazos.data,
        titulo: prazos.titulo,
        observacao: prazos.observacao,
        conteudo: prazos.conteudo,
        defesa: prazos.defesa,
        situacao: prazos.situacao,
        cumpridoNome: usuarios.nome,
        cumpridoSobrenome: usuarios.sobrenome,
        cumpridoEm: prazos.cumpridoEm,
      })
      .from(prazos)
      .leftJoin(usuarios, eq(usuarios.id, prazos.cumpridoPorId))
      .where(and(eq(prazos.data, dia), filtro))
      .orderBy(desc(prazos.id)),
    db
      .select({
        id: audiencias.id,
        numeroProcesso: audiencias.numeroProcesso,
        vara: audiencias.vara,
        local: audiencias.local,
        reclamante: audiencias.reclamante,
        reclamado: audiencias.reclamado,
        preposto: audiencias.preposto,
        dataHora: audiencias.dataHora,
        tipo: audiencias.tipo,
      })
      .from(audiencias)
      .where(
        and(sql`${diaAudiencia} = ${dia}::date`, filtroDaAudiencia(advogadoId)),
      )
      .orderBy(asc(audiencias.dataHora), asc(audiencias.id)),
  ]);

  const ids = prazosDia.map((item) => item.id);
  const vinculos =
    ids.length === 0
      ? []
      : await db
          .select({
            prazoId: prazosUsuarios.prazoId,
            nome: usuarios.nome,
            sobrenome: usuarios.sobrenome,
          })
          .from(prazosUsuarios)
          .innerJoin(usuarios, eq(usuarios.id, prazosUsuarios.usuarioId))
          .where(inArray(prazosUsuarios.prazoId, ids))
          .orderBy(asc(usuarios.nome), asc(usuarios.sobrenome));
  const nomes = new Map<number, string[]>();
  for (const vinculo of vinculos) {
    const lista = nomes.get(vinculo.prazoId) ?? [];
    lista.push(`${vinculo.nome} ${vinculo.sobrenome}`.trim());
    nomes.set(vinculo.prazoId, lista);
  }
  return {
    prazos: prazosDia.map((item) => ({
      id: item.id,
      area: item.area,
      data: item.data,
      titulo: item.titulo,
      observacao: item.observacao,
      conteudo: item.conteudo,
      defesa: item.defesa,
      situacao: item.situacao,
      cumpridoPor: item.cumpridoNome
        ? `${item.cumpridoNome} ${item.cumpridoSobrenome ?? ""}`.trim()
        : null,
      cumpridoEm: item.cumpridoEm,
      advogados: nomes.get(item.id) ?? [],
    })),
    audiencias: audienciasDia,
  };
}
