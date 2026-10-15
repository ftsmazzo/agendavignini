import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
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
    fila?: string;
  }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-muted">Abrindo os prazos sem advogado.</p>}
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
    fila?: string;
  }>;
}) {
  await connection();
  const {
    dia: diaPedido,
    marcados,
    advogados: advogadosPedido,
    fila,
  } = await searchParams;
  const emAtraso = fila === "atraso";
  const hoje = hojeNoEscritorio();
  const db = obterDb();
  const semVinculo = sql`not exists (select 1 from prazos_usuarios where prazo_id = ${prazos.id})`;
  const recorte = emAtraso
    ? and(eq(prazos.situacao, "aberto"), lt(prazos.data, hoje), semVinculo)
    : and(gte(prazos.data, hoje), semVinculo);
  const dias = await db
    .select({
      data: prazos.data,
      total: sql<number>`count(*)::int`,
    })
    .from(prazos)
    .where(recorte)
    .groupBy(prazos.data)
    .orderBy(emAtraso ? desc(prazos.data) : asc(prazos.data));
  const total = dias.reduce((soma, dia) => soma + dia.total, 0);
  const pedido =
    diaPedido &&
    dataIsoValida(diaPedido) &&
    (emAtraso ? diaPedido < hoje : diaPedido >= hoje)
      ? diaPedido
      : "";
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
            processo: sql<
              string | null
            >`substring((${prazos.titulo} || ' ' || ${prazos.observacao} || ' ' || ${prazos.conteudo}) from '[0-9]{7}-[0-9]{2}\\.[0-9]{4}\\.[0-9]\\.[0-9]{2}\\.[0-9]{4}')`,
          })
          .from(prazos)
          .where(
            emAtraso
              ? and(
                  eq(prazos.data, dia),
                  eq(prazos.situacao, "aberto"),
                  semVinculo,
                )
              : and(eq(prazos.data, dia), semVinculo),
          )
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
    if (emAtraso) {
      params.set("fila", "atraso");
    }
    if (equipe.length > 0) {
      params.set("advogados", equipe.join(","));
    }
    return `/admin/prazos/sem-advogado?${params}`;
  }

  return (
    <section className="entrada mx-auto w-full max-w-5xl">
      <h1 className="titulo-pagina">
        {emAtraso ? "Vencidos sem dono" : "Sem advogado"}
      </h1>
      <p className="subtitulo-pagina">
        {emAtraso
          ? "Prazos em aberto que já venceram e ainda não têm responsável. O dia mais recente aparece primeiro."
          : "Prazos de hoje em diante que ainda não têm responsável."}
      </p>
      <nav aria-label="Qual fila" className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/admin/prazos/sem-advogado"
          aria-current={emAtraso ? undefined : "page"}
          className="chip"
        >
          Daqui pra frente
        </Link>
        <Link
          href="/admin/prazos/sem-advogado?fila=atraso"
          aria-current={emAtraso ? "page" : undefined}
          className="chip"
        >
          Em atraso
        </Link>
        {emAtraso ? (
          <Link href="/admin/relatorios" className="btn-texto px-2">
            Ver quem está livre
          </Link>
        ) : null}
      </nav>
      <p className="mt-3">
        <span className={total === 0 ? "selo selo-ok" : "selo selo-atraso"}>
          {total === 1
            ? "1 prazo sem advogado."
            : `${total} prazos sem advogado.`}
        </span>
      </p>
      {quantidadeMarcada > 0 ? (
        <output className="aviso aviso-ok mt-4 block">
          {quantidadeMarcada === 1
            ? "1 prazo marcado."
            : `${quantidadeMarcada} prazos marcados.`}
        </output>
      ) : null}
      {dias.length === 0 ? (
        <p className="vazio mt-6">
          {emAtraso
            ? "Não há prazo vencido sem advogado."
            : "De hoje em diante, todo prazo tem advogado."}
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            {anterior ? (
              <Link href={endereco(anterior.data)} className="btn">
                <span aria-hidden="true">←</span>
                <span className="text-left">
                  {emAtraso ? "Mais recente" : "Anterior"}
                  <span className="block text-sm font-normal text-muted">
                    {dataBr(anterior.data)} · {anterior.total}
                  </span>
                </span>
              </Link>
            ) : (
              <span />
            )}
            <h2 className="text-center text-2xl font-bold text-ink">
              {dataBr(dia)}
              <span className="block text-base font-normal text-muted">
                {itens.length === 1 ? "1 prazo" : `${itens.length} prazos`}
              </span>
            </h2>
            {proximo ? (
              <Link href={endereco(proximo.data)} className="btn">
                <span className="text-right">
                  {emAtraso ? "Mais antigo" : "Próximo"}
                  <span className="block text-sm font-normal text-muted">
                    {dataBr(proximo.data)} · {proximo.total}
                  </span>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <span />
            )}
          </div>
          <form
            method="get"
            className="cartao mt-6 flex flex-wrap items-end gap-3 p-4"
          >
            <div>
              <label htmlFor="dia" className="rotulo-campo">
                Dia
              </label>
              <select id="dia" name="dia" defaultValue={dia} className="campo">
                {dias.map((item) => (
                  <option key={item.data} value={item.data}>
                    {dataBr(item.data)} · {item.total}
                  </option>
                ))}
              </select>
            </div>
            {emAtraso ? (
              <input type="hidden" name="fila" value="atraso" />
            ) : null}
            {equipe.length > 0 ? (
              <input type="hidden" name="advogados" value={equipe.join(",")} />
            ) : null}
            <button type="submit" className="btn btn-primario">
              Ver dia
            </button>
          </form>
          {itens.length === 0 ? (
            <p className="vazio mt-6">Nenhum prazo sem advogado neste dia.</p>
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
                processo: item.processo ?? "",
              }))}
              pessoas={pessoas}
              advogadosIniciais={equipe}
              seguir={seguir}
              fila={emAtraso ? "atraso" : undefined}
            />
          )}
        </>
      )}
    </section>
  );
}
