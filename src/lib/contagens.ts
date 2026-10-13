import { and, eq, sql } from "drizzle-orm";
import { obterDb } from "@/db/client";
import { audiencias, audienciasUsuarios, prazos } from "@/db/schema";

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

  return {
    hoje: hojeConta ?? { total: 0, cumpridos: 0 },
    semana: semanaConta ?? { total: 0, cumpridos: 0 },
    audiencias: audienciasConta?.total ?? 0,
    minhasAudiencias: minhas?.total ?? 0,
  };
}
