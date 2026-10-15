import { and, asc, desc, eq, gt, inArray, lt, lte, sql } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormularioCumprir } from "@/components/formulario-cumprir";
import { obterDb } from "@/db/client";
import { prazos, prazosUsuarios, usuarios } from "@/db/schema";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr, dataIsoValida } from "@/lib/datas";
import { faixaDaArea, marcaDoPrazo, rotuloArea } from "@/lib/resumo";

const SELO = {
  vermelho: "bg-late text-late-ink",
  amarelo: "bg-today-mark text-today-ink",
  verde: "bg-done-mark text-done-ink",
} as const;

const JANELA = 15;

export default function EmAtraso({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; cumpridos?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <p className="text-xl text-muted">Abrindo os prazos em atraso.</p>
      }
    >
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

async function Lista({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; cumpridos?: string }>;
}) {
  await connection();
  const { dia: diaPedido, cumpridos } = await searchParams;
  const hoje = hojeNoEscritorio();
  const ancora =
    diaPedido && dataIsoValida(diaPedido) && diaPedido < hoje ? diaPedido : "";
  const db = obterDb();
  const abertoAntes = and(eq(prazos.situacao, "aberto"), lt(prazos.data, hoje));
  const [conta] = await db
    .select({
      total: sql<number>`count(*)::int`,
      dias: sql<number>`count(distinct ${prazos.data})::int`,
    })
    .from(prazos)
    .where(abertoAntes);
  const linhas = await db
    .select({
      data: prazos.data,
      total: sql<number>`count(*)::int`,
    })
    .from(prazos)
    .where(ancora ? and(abertoAntes, lte(prazos.data, ancora)) : abertoAntes)
    .groupBy(prazos.data)
    .orderBy(desc(prazos.data))
    .limit(JANELA + 1);
  const dias = linhas.slice(0, JANELA);
  const dia = dias.some((item) => item.data === ancora)
    ? ancora
    : (dias[0]?.data ?? "");
  const indice = dias.findIndex((item) => item.data === dia);
  const antigo =
    indice >= 0 && indice < dias.length - 1
      ? dias[indice + 1]
      : indice === dias.length - 1
        ? linhas[JANELA]
        : undefined;
  const recenteNaLista = indice > 0 ? dias[indice - 1] : undefined;
  const [maisNovo] = recenteNaLista
    ? [recenteNaLista]
    : dia
      ? await db
          .select({ data: prazos.data, total: sql<number>`count(*)::int` })
          .from(prazos)
          .where(and(abertoAntes, gt(prazos.data, dia)))
          .groupBy(prazos.data)
          .orderBy(asc(prazos.data))
          .limit(1)
      : [];
  const itens = dia
    ? await db
        .select({
          id: prazos.id,
          area: prazos.area,
          data: prazos.data,
          titulo: prazos.titulo,
          situacao: prazos.situacao,
        })
        .from(prazos)
        .where(and(eq(prazos.data, dia), eq(prazos.situacao, "aberto")))
        .orderBy(asc(prazos.titulo), asc(prazos.id))
    : [];
  const ids = itens.map((item) => item.id);
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
  const ordem = { administrativo: 0, civil: 1, trabalhista: 2 };
  itens.sort(
    (a, b) =>
      ordem[a.area] - ordem[b.area] ||
      a.titulo.localeCompare(b.titulo, "pt-BR"),
  );
  const quantidade = /^\d{1,4}$/.test(cumpridos ?? "") ? Number(cumpridos) : 0;
  const total = conta?.total ?? 0;
  const diasTotal = conta?.dias ?? 0;

  return (
    <section className="w-full">
      <h1 className="text-4xl leading-tight font-bold text-ink">Em atraso</h1>
      <p className="mt-3 text-xl text-muted">
        Prazos em aberto cuja data já passou. O dia mais recente aparece
        primeiro.
      </p>
      <p className="mt-2 text-2xl text-ink">
        {total === 1
          ? "1 prazo em atraso."
          : `${total} prazos em atraso, em ${diasTotal} dias.`}
      </p>
      {quantidade > 0 ? (
        <output className="mt-4 block text-xl text-done">
          {quantidade === 1
            ? "1 prazo cumprido."
            : `${quantidade} prazos cumpridos.`}
        </output>
      ) : null}
      {dias.length === 0 ? (
        <p className="mt-8 text-xl text-ink">
          Não há prazo em aberto com data que já passou.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            {maisNovo ? (
              <Link
                href={`/prazos/atraso?dia=${maisNovo.data}`}
                className="border border-line bg-sheet px-4 py-3 text-lg font-semibold text-ink"
              >
                Mais recente
                <span className="mt-1 block text-base font-normal text-muted">
                  {dataBr(maisNovo.data)} · {maisNovo.total}
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
            {antigo ? (
              <Link
                href={`/prazos/atraso?dia=${antigo.data}`}
                className="border border-line bg-sheet px-4 py-3 text-right text-lg font-semibold text-ink"
              >
                Mais antigo
                <span className="mt-1 block text-base font-normal text-muted">
                  {dataBr(antigo.data)} · {antigo.total}
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
            <button
              type="submit"
              className="bg-pen px-4 py-3 text-lg font-semibold text-sheet"
            >
              Ver dia
            </button>
            <Link
              href={`/prazos?data=${dia}`}
              className="px-2 py-3 text-lg text-pen"
            >
              Abrir a lista do dia
            </Link>
          </form>
          <FormularioCumprir
            key={dia}
            dia={dia}
            origem="atraso"
            itens={itens.map((item) => {
              const marca = marcaDoPrazo(item.situacao, item.data, hoje);
              return {
                id: item.id,
                titulo: item.titulo,
                faixa: faixaDaArea(item.area),
                rotulo: rotuloArea(item.area),
                marca: marca.texto,
                selo: SELO[marca.tom],
                advogados: (advogados.get(item.id) ?? []).join(", "),
              };
            })}
          />
        </>
      )}
    </section>
  );
}
