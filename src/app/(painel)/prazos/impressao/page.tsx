import { and, asc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { BotaoImprimir } from "@/components/botao-imprimir";
import { obterDb } from "@/db/client";
import { prazos, prazosUsuarios, usuarios } from "@/db/schema";
import { exigirUsuario } from "@/lib/acesso";
import { dataBr, dataIsoValida } from "@/lib/datas";
import { rotuloArea, statusDoPrazo } from "@/lib/resumo";

const AREAS = ["administrativo", "civil", "trabalhista"] as const;

export default function ImpressaoPrazos({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; area?: string }>;
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
  searchParams: Promise<{ data?: string; area?: string }>;
}) {
  const { data, area } = await searchParams;
  await exigirUsuario();
  const dia = data && dataIsoValida(data) ? data : "";
  const tipo = AREAS.find((item) => item === area) ?? null;
  const db = obterDb();
  const linhas = dia
    ? await db
        .select({
          id: prazos.id,
          area: prazos.area,
          data: prazos.data,
          titulo: prazos.titulo,
          observacao: prazos.observacao,
          conteudo: prazos.conteudo,
          situacao: prazos.situacao,
          cumpridoNome: usuarios.nome,
          cumpridoSobrenome: usuarios.sobrenome,
          cumpridoEm: prazos.cumpridoEm,
        })
        .from(prazos)
        .leftJoin(usuarios, eq(usuarios.id, prazos.cumpridoPorId))
        .where(
          and(eq(prazos.data, dia), tipo ? eq(prazos.area, tipo) : undefined),
        )
        .orderBy(
          sql`case ${prazos.area} when 'administrativo' then 1 when 'civil' then 2 else 3 end`,
          asc(prazos.id),
        )
    : [];

  const ids = linhas.map((linha) => linha.id);
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
          .orderBy(asc(usuarios.nome));
  const advogados = new Map<number, string[]>();
  for (const vinculo of vinculos) {
    const lista = advogados.get(vinculo.prazoId) ?? [];
    lista.push(`${vinculo.nome} ${vinculo.sobrenome}`.trim());
    advogados.set(vinculo.prazoId, lista);
  }

  return (
    <section className="mx-auto w-full max-w-4xl">
      <div className="nao-imprimir flex flex-wrap items-center gap-3">
        <BotaoImprimir />
        <Link
          href={dia ? `/prazos?data=${dia}` : "/prazos"}
          className="text-lg text-pen"
        >
          Voltar
        </Link>
        {AREAS.map((item) => (
          <Link
            key={item}
            href={`/prazos/impressao?data=${dia}&area=${item}`}
            className="text-lg text-pen"
          >
            {rotuloArea(item)}
          </Link>
        ))}
        {tipo ? (
          <Link
            href={`/prazos/impressao?data=${dia}`}
            className="text-lg text-pen"
          >
            Todas as áreas
          </Link>
        ) : null}
      </div>
      <h1 className="mt-6 text-4xl leading-tight font-bold text-ink">
        {dia ? `Prazos de ${dataBr(dia)}` : "Informe o dia"}
      </h1>
      {linhas.length === 0 ? (
        <p className="mt-8 text-xl text-ink">Nenhum prazo nesta folha.</p>
      ) : (
        linhas.map((item) => (
          <article key={item.id} className="mt-8 border-b border-line pb-6">
            <h2 className="text-2xl font-bold text-ink">{item.titulo}</h2>
            <p className="mt-2 text-lg text-ink">
              {rotuloArea(item.area)} · {dataBr(item.data)} ·{" "}
              {statusDoPrazo({
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
              })}
            </p>
            {(advogados.get(item.id) ?? []).length > 0 ? (
              <p className="mt-4 text-xl text-ink">
                <strong>Advogados:</strong>{" "}
                {(advogados.get(item.id) ?? []).join(", ")}
              </p>
            ) : null}
            {item.observacao ? (
              <p className="mt-4 text-xl whitespace-pre-wrap text-ink">
                <strong>Observação:</strong>
                {"\n"}
                {item.observacao}
              </p>
            ) : null}
            {item.conteudo ? (
              <p className="mt-4 text-xl whitespace-pre-wrap text-ink">
                <strong>Descrição:</strong>
                {"\n"}
                {item.conteudo}
              </p>
            ) : null}
          </article>
        ))
      )}
    </section>
  );
}
