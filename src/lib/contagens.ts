import { and, eq, gte, lt, lte, sql } from "drizzle-orm";
import { obterDb } from "@/db/client";
import {
  audiencias,
  audienciasUsuarios,
  prazos,
  prazosUsuarios,
} from "@/db/schema";
import { fimDoMes } from "@/lib/calendario";

export function hojeNoEscritorio(agora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

function mesmaSemana(expressao: ReturnType<typeof sql>, hoje: string) {
  return sql`extract(week from ${expressao}) = extract(week from ${hoje}::date) and extract(year from ${expressao}) = extract(year from ${hoje}::date)`;
}

export async function contarPainel(hoje: string, usuarioId: number) {
  const db = obterDb();
  const [hojeConta] = await db
    .select({
      total: sql<number>`count(*)::int`,
      cumpridos: sql<number>`count(*) filter (where ${prazos.situacao} = 'cumprido')::int`,
    })
    .from(prazos)
    .where(eq(prazos.data, hoje));

  const [semanaConta] = await db
    .select({
      total: sql<number>`count(*)::int`,
      cumpridos: sql<number>`count(*) filter (where ${prazos.situacao} = 'cumprido')::int`,
    })
    .from(prazos)
    .where(mesmaSemana(sql`${prazos.data}`, hoje));

  const instanteLocal = sql`(${audiencias.dataHora} at time zone 'America/Sao_Paulo')`;
  const [audienciasConta] = await db
    .select({
      total: sql<number>`count(*)::int`,
    })
    .from(audiencias)
    .where(mesmaSemana(instanteLocal, hoje));

  const [minhas] = await db
    .select({
      total: sql<number>`count(*)::int`,
    })
    .from(audiencias)
    .innerJoin(
      audienciasUsuarios,
      eq(audienciasUsuarios.audienciaId, audiencias.id),
    )
    .where(
      and(
        mesmaSemana(instanteLocal, hoje),
        eq(audienciasUsuarios.usuarioId, usuarioId),
      ),
    );

  const [atrasoConta] = await db
    .select({
      total: sql<number>`count(*)::int`,
    })
    .from(prazos)
    .where(and(eq(prazos.situacao, "aberto"), lt(prazos.data, hoje)));

  const [meusConta] = await db
    .select({
      total: sql<number>`count(*)::int`,
    })
    .from(prazos)
    .innerJoin(prazosUsuarios, eq(prazosUsuarios.prazoId, prazos.id))
    .where(
      and(
        eq(prazos.situacao, "aberto"),
        eq(prazosUsuarios.usuarioId, usuarioId),
      ),
    );

  return {
    hoje: hojeConta ?? { total: 0, cumpridos: 0 },
    semana: semanaConta ?? { total: 0, cumpridos: 0 },
    audiencias: audienciasConta?.total ?? 0,
    minhasAudiencias: minhas?.total ?? 0,
    atraso: atrasoConta?.total ?? 0,
    meusAbertos: meusConta?.total ?? 0,
  };
}

export type MarcaDia = "vencido" | "atual" | "em-dia" | "concluido";

function marcarDias(
  linhas: Array<{ data: string | null; abertos: number; total: number }>,
  hoje: string,
) {
  const marcas: Record<string, MarcaDia> = {};
  for (const linha of linhas) {
    if (!linha.data) {
      continue;
    }
    if (linha.abertos > 0) {
      if (linha.data < hoje) {
        marcas[linha.data] = "vencido";
      } else if (linha.data === hoje) {
        marcas[linha.data] = "atual";
      } else {
        marcas[linha.data] = "em-dia";
      }
    } else if (linha.total > 0) {
      marcas[linha.data] = "concluido";
    }
  }
  return marcas;
}

const colunasDoDia = {
  data: prazos.data,
  abertos: sql<number>`count(*) filter (where ${prazos.situacao} = 'aberto')::int`,
  total: sql<number>`count(*)::int`,
};

export type ResumoDia = {
  abertos: number;
  cumpridos: number;
  administrativo: number;
  civil: number;
  trabalhista: number;
  audiencias: number;
};

export async function resumosDoMes(ano: number, mes: number) {
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const fim = fimDoMes(ano, mes);
  const db = obterDb();
  const linhas = await db
    .select({
      data: prazos.data,
      area: prazos.area,
      abertos: sql<number>`count(*) filter (where ${prazos.situacao} = 'aberto')::int`,
      cumpridos: sql<number>`count(*) filter (where ${prazos.situacao} = 'cumprido')::int`,
    })
    .from(prazos)
    .where(and(gte(prazos.data, inicio), lte(prazos.data, fim)))
    .groupBy(prazos.data, prazos.area);

  const diaAudiencia = sql<string>`to_char(${audiencias.dataHora} at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')`;
  const oitivas = await db
    .select({
      data: diaAudiencia,
      total: sql<number>`count(*)::int`,
    })
    .from(audiencias)
    .where(
      sql`(${audiencias.dataHora} at time zone 'America/Sao_Paulo')::date between ${inicio}::date and ${fim}::date`,
    )
    .groupBy(diaAudiencia);

  const resumos: Record<string, ResumoDia> = {};
  const garantir = (data: string) => {
    const atual = resumos[data] ?? {
      abertos: 0,
      cumpridos: 0,
      administrativo: 0,
      civil: 0,
      trabalhista: 0,
      audiencias: 0,
    };
    resumos[data] = atual;
    return atual;
  };

  for (const linha of linhas) {
    const dia = garantir(linha.data);
    const quantidade = linha.abertos + linha.cumpridos;
    dia.abertos += linha.abertos;
    dia.cumpridos += linha.cumpridos;
    dia[linha.area] += quantidade;
  }
  for (const linha of oitivas) {
    if (linha.data) {
      garantir(linha.data).audiencias += linha.total;
    }
  }
  return resumos;
}

export async function marcasDoAno(ano: number, hoje: string) {
  const db = obterDb();
  const linhas = await db
    .select(colunasDoDia)
    .from(prazos)
    .where(
      and(gte(prazos.data, `${ano}-01-01`), lte(prazos.data, `${ano}-12-31`)),
    )
    .groupBy(prazos.data);
  return marcarDias(linhas, hoje);
}
