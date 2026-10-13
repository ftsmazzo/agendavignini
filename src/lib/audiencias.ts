import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { obterDb } from "@/db/client";
import { audiencias, audienciasUsuarios, usuarios } from "@/db/schema";
import { hojeNoEscritorio } from "@/lib/contagens";
import { semanaDe, somarDias } from "@/lib/datas";

export async function listarAudiencias(dia: string | null) {
  const db = obterDb();
  const hoje = hojeNoEscritorio();
  const inicio = new Date(`${dia ?? hoje}T00:00:00-03:00`);
  const filtro = dia
    ? and(
        gte(audiencias.dataHora, inicio),
        lt(
          audiencias.dataHora,
          new Date(inicio.getTime() + 24 * 60 * 60 * 1000),
        ),
      )
    : gte(audiencias.dataHora, inicio);

  const linhas = await db
    .select()
    .from(audiencias)
    .where(filtro)
    .orderBy(asc(audiencias.dataHora), asc(audiencias.id))
    .limit(150);

  if (linhas.length === 0) {
    return [];
  }

  const vinculos = await db
    .select({
      audienciaId: audienciasUsuarios.audienciaId,
      nome: usuarios.nome,
      sobrenome: usuarios.sobrenome,
    })
    .from(audienciasUsuarios)
    .innerJoin(usuarios, eq(usuarios.id, audienciasUsuarios.usuarioId))
    .where(
      inArray(
        audienciasUsuarios.audienciaId,
        linhas.map((linha) => linha.id),
      ),
    );

  const nomes = new Map<number, string[]>();
  for (const vinculo of vinculos) {
    const lista = nomes.get(vinculo.audienciaId) ?? [];
    lista.push(`${vinculo.nome} ${vinculo.sobrenome}`.trim());
    nomes.set(vinculo.audienciaId, lista);
  }

  return linhas.map((linha) => ({
    ...linha,
    advogados: nomes.get(linha.id) ?? [],
  }));
}

function diaNoEscritorio(valor: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(valor);
}

function horaNoEscritorio(valor: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(valor);
}

export async function listarAudienciasDaSemana(
  ancora: string,
  usuarioId: number,
) {
  const semana = semanaDe(ancora);
  const dias = [0, 1, 2, 3, 4].map((passo) => somarDias(semana.inicio, passo));
  const db = obterDb();
  const diaLocal = sql`(${audiencias.dataHora} at time zone 'America/Sao_Paulo')::date`;
  const linhas = await db
    .select()
    .from(audiencias)
    .where(
      and(
        sql`${diaLocal} >= ${semana.inicio}::date`,
        sql`${diaLocal} <= ${dias[4]}::date`,
      ),
    )
    .orderBy(asc(audiencias.dataHora), asc(audiencias.id));

  const vinculos =
    linhas.length === 0
      ? []
      : await db
          .select({
            audienciaId: audienciasUsuarios.audienciaId,
            usuarioId: audienciasUsuarios.usuarioId,
            nome: usuarios.nome,
            sobrenome: usuarios.sobrenome,
          })
          .from(audienciasUsuarios)
          .innerJoin(usuarios, eq(usuarios.id, audienciasUsuarios.usuarioId))
          .where(
            inArray(
              audienciasUsuarios.audienciaId,
              linhas.map((linha) => linha.id),
            ),
          )
          .orderBy(asc(usuarios.nome));

  const nomes = new Map<number, string[]>();
  const minhas = new Set<number>();
  for (const vinculo of vinculos) {
    const lista = nomes.get(vinculo.audienciaId) ?? [];
    lista.push(`${vinculo.nome} ${vinculo.sobrenome}`.trim());
    nomes.set(vinculo.audienciaId, lista);
    if (vinculo.usuarioId === usuarioId) {
      minhas.add(vinculo.audienciaId);
    }
  }

  return {
    inicio: semana.inicio,
    sexta: dias[4] ?? semana.inicio,
    anterior: somarDias(semana.inicio, -7),
    proxima: somarDias(semana.inicio, 7),
    dias,
    itens: linhas.map((linha) => ({
      id: linha.id,
      dia: diaNoEscritorio(linha.dataHora),
      hora: horaNoEscritorio(linha.dataHora),
      numeroProcesso: linha.numeroProcesso,
      vara: linha.vara,
      local: linha.local,
      reclamante: linha.reclamante,
      reclamado: linha.reclamado,
      preposto: linha.preposto,
      observacao: linha.observacao,
      advogados: nomes.get(linha.id) ?? [],
      minha: minhas.has(linha.id),
    })),
  };
}
