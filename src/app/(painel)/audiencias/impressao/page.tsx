import { and, asc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BotaoImprimir } from "@/components/botao-imprimir";
import { obterDb } from "@/db/client";
import { audiencias, audienciasUsuarios, usuarios } from "@/db/schema";
import { exigirUsuario } from "@/lib/acesso";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr, dataHoraBr, dataIsoValida, semanaDe } from "@/lib/datas";

export default function ImpressaoAudiencias({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-xl text-muted">Abrindo a folha.</p>}>
      <Folha searchParams={searchParams} />
    </Suspense>
  );
}

async function Folha({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const { data } = await searchParams;
  await connection();
  await exigirUsuario();
  const hoje = hojeNoEscritorio();
  const dia = data && dataIsoValida(data) ? data : hoje;
  const semana = semanaDe(dia);
  const db = obterDb();
  const diaLocal = sql`(${audiencias.dataHora} at time zone 'America/Sao_Paulo')::date`;
  const linhas = await db
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
    .from(audiencias)
    .where(
      and(
        sql`${diaLocal} >= ${semana.inicio}::date`,
        sql`${diaLocal} <= ${semana.fim}::date`,
      ),
    )
    .orderBy(asc(audiencias.dataHora), asc(audiencias.id));

  const ids = linhas.map((linha) => linha.id);
  const vinculos =
    ids.length === 0
      ? []
      : await db
          .select({
            audienciaId: audienciasUsuarios.audienciaId,
            nome: usuarios.nome,
            sobrenome: usuarios.sobrenome,
          })
          .from(audienciasUsuarios)
          .innerJoin(usuarios, eq(usuarios.id, audienciasUsuarios.usuarioId))
          .where(inArray(audienciasUsuarios.audienciaId, ids))
          .orderBy(asc(usuarios.nome));
  const advogados = new Map<number, string[]>();
  for (const vinculo of vinculos) {
    const lista = advogados.get(vinculo.audienciaId) ?? [];
    lista.push(`${vinculo.nome} ${vinculo.sobrenome}`.trim());
    advogados.set(vinculo.audienciaId, lista);
  }

  return (
    <section className="mx-auto w-full max-w-4xl">
      <div className="nao-imprimir flex flex-wrap items-center gap-3">
        <BotaoImprimir />
        <Link href={`/audiencias?data=${dia}`} className="text-lg text-pen">
          Voltar
        </Link>
      </div>
      <h1 className="mt-6 text-4xl leading-tight font-bold text-ink">
        Audiências da semana de {dataBr(semana.inicio)} até {dataBr(semana.fim)}
      </h1>
      {linhas.length === 0 ? (
        <p className="mt-8 text-xl text-ink">Nenhuma audiência nesta semana.</p>
      ) : (
        linhas.map((item) => (
          <article key={item.id} className="mt-8 border-b border-line pb-6">
            <h2 className="text-2xl font-bold text-ink">
              {item.numeroProcesso || "Sem número"} ·{" "}
              {dataHoraBr(item.dataHora)}
            </h2>
            <p className="mt-3 text-xl text-ink">
              <strong>Processo:</strong> {item.numeroProcesso}
            </p>
            <p className="mt-2 text-xl text-ink">
              <strong>Partes:</strong> {item.reclamado || ""} X{" "}
              {item.reclamante || ""}
            </p>
            <p className="mt-2 text-xl text-ink">
              <strong>
                {item.tipo === "pericia" ? "Perícia" : "Audiência"}:
              </strong>{" "}
              {dataHoraBr(item.dataHora)}
              {item.vara ? ` · ${item.vara}` : ""}
              {item.local ? ` · ${item.local}` : ""}
            </p>
            {item.preposto ? (
              <p className="mt-2 text-xl text-ink">
                <strong>Preposto:</strong> {item.preposto}
              </p>
            ) : null}
            {(advogados.get(item.id) ?? []).length > 0 ? (
              <p className="mt-2 text-xl text-ink">
                <strong>Advogados:</strong>{" "}
                {(advogados.get(item.id) ?? []).join(", ")}
              </p>
            ) : null}
            {item.observacao ? (
              <p className="mt-4 text-xl whitespace-pre-wrap text-ink">
                {item.observacao}
              </p>
            ) : null}
          </article>
        ))
      )}
    </section>
  );
}
