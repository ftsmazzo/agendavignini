import { and, asc, eq, gte, sql } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormularioResponsavel } from "@/components/formulario-responsavel";
import { obterDb } from "@/db/client";
import { prazos } from "@/db/schema";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr, dataIsoValida } from "@/lib/datas";
import { listarPessoas } from "@/lib/pessoas";
import { faixaDaArea, marcaDoPrazo, rotuloArea } from "@/lib/resumo";

export default function SemAdvogado({
  searchParams,
}: {
  searchParams: Promise<{
    dia?: string;
    marcados?: string;
    advogados?: string;
  }>;
}) {
  return (
    <Suspense
      fallback={
        <p className="text-xl text-muted">Abrindo os prazos sem advogado.</p>
      }
    >
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

async function Lista({
  searchParams,
}: {
  searchParams: Promise<{
    dia?: string;
    marcados?: string;
    advogados?: string;
  }>;
}) {
  await connection();
  const {
    dia: diaPedido,
    marcados,
    advogados: advogadosPedido,
  } = await searchParams;
  const hoje = hojeNoEscritorio();
  const db = obterDb();
  const semVinculo = sql`not exists (select 1 from prazos_usuarios where prazo_id = ${prazos.id})`;
  const dias = await db
    .select({
      data: prazos.data,
      total: sql<number>`count(*)::int`,
    })
    .from(prazos)
    .where(and(gte(prazos.data, hoje), semVinculo))
    .groupBy(prazos.data)
    .orderBy(asc(prazos.data));
  const total = dias.reduce((soma, dia) => soma + dia.total, 0);
  const pedido =
    diaPedido && dataIsoValida(diaPedido) && diaPedido >= hoje ? diaPedido : "";
  const dia = dias.some((item) => item.data === pedido)
    ? pedido
    : (dias[0]?.data ?? hoje);
  const indice = dias.findIndex((item) => item.data === dia);
  const anterior = indice > 0 ? dias[indice - 1] : undefined;
  const proximo = indice >= 0 ? dias[indice + 1] : undefined;
  const itens =
    dias.length === 0
      ? []
      : await db
          .select({
            id: prazos.id,
            area: prazos.area,
            data: prazos.data,
            titulo: prazos.titulo,
            situacao: prazos.situacao,
          })
          .from(prazos)
          .where(and(eq(prazos.data, dia), semVinculo))
          .orderBy(asc(prazos.titulo), asc(prazos.id));
  const pessoas = (await listarPessoas())
    .filter((pessoa) => pessoa.ativo)
    .map((pessoa) => ({ id: pessoa.id, nome: pessoa.nome }));
  const ativos = new Set(pessoas.map((pessoa) => pessoa.id));
  const equipe = [
    ...new Set(
      (advogadosPedido ?? "")
        .split(",")
        .map((valor) => Number(valor))
        .filter((valor) => ativos.has(valor)),
    ),
  ].slice(0, 20);
  const seguir = equipe.length > 0;
  const quantidadeMarcada = /^\d{1,4}$/.test(marcados ?? "")
    ? Number(marcados)
    : 0;
  const ordem = { administrativo: 0, civil: 1, trabalhista: 2 };
  itens.sort(
    (a, b) =>
      ordem[a.area] - ordem[b.area] ||
      a.titulo.localeCompare(b.titulo, "pt-BR"),
  );

  function endereco(data: string) {
    const params = new URLSearchParams({ dia: data });
    if (equipe.length > 0) {
      params.set("advogados", equipe.join(","));
    }
    return `/admin/prazos/sem-advogado?${params}`;
  }

  return (
    <section className="w-full">
      <h1 className="text-4xl leading-tight font-bold text-ink">
        Sem advogado
      </h1>
      <p className="mt-3 text-xl text-muted">
        Prazos de hoje em diante que ainda não têm responsável.
      </p>
      <p className="mt-2 text-2xl text-ink">
        {total === 1
          ? "1 prazo sem advogado."
          : `${total} prazos sem advogado.`}
      </p>
      {quantidadeMarcada > 0 ? (
        <output className="mt-4 block text-xl text-done">
          {quantidadeMarcada === 1
            ? "1 prazo marcado."
            : `${quantidadeMarcada} prazos marcados.`}
        </output>
      ) : null}
      {dias.length === 0 ? (
        <p className="mt-8 text-xl text-ink">
          De hoje em diante, todo prazo tem advogado.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            {anterior ? (
              <Link
                href={endereco(anterior.data)}
                className="border border-line bg-sheet px-4 py-3 text-lg font-semibold text-ink"
              >
                Anterior
                <span className="mt-1 block text-base font-normal text-muted">
                  {dataBr(anterior.data)} · {anterior.total}
                </span>
              </Link>
            ) : (
              <span />
            )}
            <h2 className="text-center text-3xl font-bold text-ink">
              {dataBr(dia)}
              <span className="mt-1 block text-lg font-normal text-muted">
                {itens.length === 1 ? "1 prazo" : `${itens.length} prazos`}
              </span>
            </h2>
            {proximo ? (
              <Link
                href={endereco(proximo.data)}
                className="border border-line bg-sheet px-4 py-3 text-right text-lg font-semibold text-ink"
              >
                Próximo
                <span className="mt-1 block text-base font-normal text-muted">
                  {dataBr(proximo.data)} · {proximo.total}
                </span>
              </Link>
            ) : (
              <span />
            )}
          </div>
          <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="dia" className="mb-2 block text-xl text-ink">
                Dia
              </label>
              <select
                id="dia"
                name="dia"
                defaultValue={dia}
                className="border border-line bg-sheet px-4 py-3 text-xl text-ink"
              >
                {dias.map((item) => (
                  <option key={item.data} value={item.data}>
                    {dataBr(item.data)} · {item.total}
                  </option>
                ))}
              </select>
            </div>
            {equipe.length > 0 ? (
              <input type="hidden" name="advogados" value={equipe.join(",")} />
            ) : null}
            <button
              type="submit"
              className="bg-pen px-4 py-3 text-lg font-semibold text-sheet"
            >
              Ver dia
            </button>
          </form>
          {itens.length === 0 ? (
            <p className="mt-8 text-xl text-ink">
              Nenhum prazo sem advogado neste dia.
            </p>
          ) : (
            <FormularioResponsavel
              key={`${dia}-${equipe.join("-")}`}
              dia={dia}
              itens={itens.map((item) => ({
                id: item.id,
                titulo: item.titulo,
                faixa: faixaDaArea(item.area),
                rotulo: rotuloArea(item.area),
                marca: marcaDoPrazo(item.situacao, item.data, hoje).texto,
              }))}
              pessoas={pessoas}
              advogadosIniciais={equipe}
              seguir={seguir}
            />
          )}
        </>
      )}
    </section>
  );
}
