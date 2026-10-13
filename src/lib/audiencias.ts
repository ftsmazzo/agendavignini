import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { obterDb } from "@/db/client";
import { audiencias, audienciasUsuarios, usuarios } from "@/db/schema";
import { hojeNoEscritorio } from "@/lib/contagens";

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
