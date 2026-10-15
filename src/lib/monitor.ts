import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { obterDb } from "@/db/client";
import { prazos, prazosUsuarios, usuarios } from "@/db/schema";
import { fimDoMes } from "@/lib/calendario";
import { dataIsoValida, semanaDe, somarDias } from "@/lib/datas";

export type CargaAdvogado = {
  id: number;
  nome: string;
  atraso: number;
  hoje: number;
  perto: number;
  frente: number;
  cumpridos: number;
};

export type PainelAdvogados = {
  inicio: string;
  fim: string;
  quando: "semana" | "mes" | "intervalo";
  atraso: number;
  venceHoje: number;
  perto: number;
  semDonoAtraso: number;
  semDonoFrente: number;
  cumpridos: number;
  pessoas: CargaAdvogado[];
};

export function periodoDoMonitor(
  quando: string | undefined,
  inicio: string | undefined,
  fim: string | undefined,
  hoje: string,
) {
  if (quando === "mes") {
    const ano = Number(hoje.slice(0, 4));
    const mes = Number(hoje.slice(5, 7));
    return {
      inicio: `${hoje.slice(0, 7)}-01`,
      fim: fimDoMes(ano, mes),
      quando: "mes" as const,
    };
  }
  if (
    inicio &&
    fim &&
    dataIsoValida(inicio) &&
    dataIsoValida(fim) &&
    inicio <= fim &&
    quando !== "semana"
  ) {
    return { inicio, fim, quando: "intervalo" as const };
  }
  return { ...semanaDe(hoje), quando: "semana" as const };
}

export function leituraDaCarga(pessoa: CargaAdvogado) {
  const abertos = pessoa.atraso + pessoa.hoje + pessoa.perto + pessoa.frente;
  if (pessoa.atraso > 0) {
    return "Prioridade";
  }
  if (pessoa.hoje + pessoa.perto > 0) {
    return "Vence agora";
  }
  if (abertos === 0) {
    return "Livre agora";
  }
  return "No prazo";
}

export async function painelAdvogados(
  hoje: string,
  inicio: string,
  fim: string,
  quando: PainelAdvogados["quando"],
) {
  const db = obterDb();
  const limite = somarDias(hoje, 2);
  const pessoasBase = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      sobrenome: usuarios.sobrenome,
    })
    .from(usuarios)
    .where(
      and(
        eq(usuarios.ativo, true),
        or(
          eq(usuarios.entraNoRelatorio, true),
          sql`exists (select 1 from prazos_usuarios where usuario_id = ${usuarios.id})`,
          sql`exists (select 1 from prazos where cumprido_por_id = ${usuarios.id})`,
        ),
      ),
    )
    .orderBy(asc(usuarios.nome), asc(usuarios.sobrenome));
  const ids = pessoasBase.map((pessoa) => pessoa.id);
  const [escritorio] = await db
    .select({
      atraso: sql<number>`count(*) filter (where ${prazos.situacao} = 'aberto' and ${prazos.data} < ${hoje}::date)::int`,
      venceHoje: sql<number>`count(*) filter (where ${prazos.situacao} = 'aberto' and ${prazos.data} = ${hoje}::date)::int`,
      perto: sql<number>`count(*) filter (where ${prazos.situacao} = 'aberto' and ${prazos.data} > ${hoje}::date and ${prazos.data} <= ${limite}::date)::int`,
      semDonoAtraso: sql<number>`count(*) filter (where ${prazos.situacao} = 'aberto' and ${prazos.data} < ${hoje}::date and not exists (select 1 from prazos_usuarios where prazo_id = ${prazos.id}))::int`,
      semDonoFrente: sql<number>`count(*) filter (where ${prazos.situacao} = 'aberto' and ${prazos.data} >= ${hoje}::date and not exists (select 1 from prazos_usuarios where prazo_id = ${prazos.id}))::int`,
    })
    .from(prazos);
  const [entregues] = await db
    .select({
      total: sql<number>`count(*)::int`,
    })
    .from(prazos)
    .where(
      and(
        eq(prazos.situacao, "cumprido"),
        sql`(${prazos.cumpridoEm} at time zone 'America/Sao_Paulo')::date between ${inicio}::date and ${fim}::date`,
      ),
    );
  const cargas =
    ids.length === 0
      ? []
      : await db
          .select({
            id: usuarios.id,
            atraso: sql<number>`count(distinct ${prazos.id}) filter (where ${prazos.situacao} = 'aberto' and ${prazos.data} < ${hoje}::date)::int`,
            hoje: sql<number>`count(distinct ${prazos.id}) filter (where ${prazos.situacao} = 'aberto' and ${prazos.data} = ${hoje}::date)::int`,
            perto: sql<number>`count(distinct ${prazos.id}) filter (where ${prazos.situacao} = 'aberto' and ${prazos.data} > ${hoje}::date and ${prazos.data} <= ${limite}::date)::int`,
            frente: sql<number>`count(distinct ${prazos.id}) filter (where ${prazos.situacao} = 'aberto' and ${prazos.data} > ${limite}::date)::int`,
          })
          .from(usuarios)
          .leftJoin(prazosUsuarios, eq(prazosUsuarios.usuarioId, usuarios.id))
          .leftJoin(prazos, eq(prazos.id, prazosUsuarios.prazoId))
          .where(inArray(usuarios.id, ids))
          .groupBy(usuarios.id);
  const feitos =
    ids.length === 0
      ? []
      : await db
          .select({
            id: prazos.cumpridoPorId,
            total: sql<number>`count(*)::int`,
          })
          .from(prazos)
          .where(
            and(
              eq(prazos.situacao, "cumprido"),
              inArray(prazos.cumpridoPorId, ids),
              sql`(${prazos.cumpridoEm} at time zone 'America/Sao_Paulo')::date between ${inicio}::date and ${fim}::date`,
            ),
          )
          .groupBy(prazos.cumpridoPorId);
  const porId = new Map(cargas.map((item) => [item.id, item]));
  const cumpridosPorId = new Map(
    feitos.map((item) => [item.id ?? 0, item.total]),
  );
  const pessoas = pessoasBase
    .map((pessoa) => {
      const carga = porId.get(pessoa.id);
      return {
        id: pessoa.id,
        nome: `${pessoa.nome} ${pessoa.sobrenome}`.trim(),
        atraso: carga?.atraso ?? 0,
        hoje: carga?.hoje ?? 0,
        perto: carga?.perto ?? 0,
        frente: carga?.frente ?? 0,
        cumpridos: cumpridosPorId.get(pessoa.id) ?? 0,
      };
    })
    .sort(
      (a, b) =>
        b.atraso - a.atraso ||
        b.hoje - a.hoje ||
        b.perto - a.perto ||
        b.frente - a.frente ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    );

  return {
    inicio,
    fim,
    quando,
    atraso: escritorio?.atraso ?? 0,
    venceHoje: escritorio?.venceHoje ?? 0,
    perto: escritorio?.perto ?? 0,
    semDonoAtraso: escritorio?.semDonoAtraso ?? 0,
    semDonoFrente: escritorio?.semDonoFrente ?? 0,
    cumpridos: entregues?.total ?? 0,
    pessoas,
  } satisfies PainelAdvogados;
}

export async function abertosDoAdvogado(usuarioId: number, limite = 15) {
  const db = obterDb();
  const vinculo = sql`exists (select 1 from prazos_usuarios where prazo_id = ${prazos.id} and usuario_id = ${usuarioId})`;
  const [conta] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(prazos)
    .where(and(eq(prazos.situacao, "aberto"), vinculo));
  const itens = await db
    .select({
      id: prazos.id,
      area: prazos.area,
      data: prazos.data,
      titulo: prazos.titulo,
      processo: sql<
        string | null
      >`substring((${prazos.titulo} || ' ' || ${prazos.observacao} || ' ' || ${prazos.conteudo}) from '[0-9]{7}-[0-9]{2}\\.[0-9]{4}\\.[0-9]\\.[0-9]{2}\\.[0-9]{4}')`,
    })
    .from(prazos)
    .where(and(eq(prazos.situacao, "aberto"), vinculo))
    .orderBy(asc(prazos.data), asc(prazos.titulo), asc(prazos.id))
    .limit(limite);
  return { total: conta?.total ?? 0, itens };
}
