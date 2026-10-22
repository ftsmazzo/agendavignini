import { and, asc, desc, eq, gt, inArray, lt, lte, sql } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormularioCumprir } from "@/components/formulario-cumprir";
import { Seta } from "@/components/seta";
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
      fallback={<p className="text-muted">Abrindo os prazos em atraso.</p>}
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
          processo: sql<
            string | null
          >`substring((${prazos.titulo} || ' ' || ${prazos.observacao} || ' ' || ${prazos.conteudo}) from '[0-9]{7}-[0-9]{2}\\.[0-9]{4}\\.[0-9]\\.[0-9]{2}\\.[0-9]{4}')`,
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
    <section className="entrada mx-auto w-full max-w-5xl">
      <h1 className="titulo-pagina">Em atraso</h1>
      <p className="subtitulo-pagina">
        Prazos em aberto cuja data já passou. O dia mais recente aparece
        primeiro.
      </p>
      <p className="mt-3">
        <span className="selo selo-atraso">
          {total === 1
            ? "1 prazo em atraso."
            : `${total} prazos em atraso, em ${diasTotal} dias.`}
        </span>
      </p>
      {quantidade > 0 ? (
        <output className="aviso aviso-ok mt-4 block">
          {quantidade === 1
            ? "1 prazo cumprido."
            : `${quantidade} prazos cumpridos.`}
        </output>
      ) : null}
      {dias.length === 0 ? (
        <p className="vazio mt-8">
          Não há prazo em aberto com data que já passou.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 items-center gap-3 sm:grid-cols-3">
            {maisNovo ? (
              <Link
                href={`/prazos/atraso?dia=${maisNovo.data}`}
                className="cartao-link flex items-center gap-3 px-4 py-3 text-base font-semibold text-ink"
              >
                <Seta />
                <span>
                  Mais recente
                  <span className="mt-1 block text-sm font-normal text-muted">
                    {dataBr(maisNovo.data)} · {maisNovo.total}
                  </span>
                </span>
              </Link>
            ) : (
              <span />
            )}
            <h2 className="text-center text-2xl font-bold text-ink">
              {dataBr(dia)}
              <span className="mt-1 block text-base font-normal text-muted">
                {itens.length === 1 ? "1 prazo" : `${itens.length} prazos`}
              </span>
            </h2>
            {antigo ? (
              <Link
                href={`/prazos/atraso?dia=${antigo.data}`}
                className="cartao-link flex items-center justify-end gap-3 px-4 py-3 text-right text-base font-semibold text-ink"
              >
                <span>
                  Mais antigo
                  <span className="mt-1 block text-sm font-normal text-muted">
                    {dataBr(antigo.data)} · {antigo.total}
                  </span>
                </span>
                <Seta direcao="direita" />
              </Link>
            ) : (
              <span />
            )}
          </div>
          <form
            method="get"
            className="cartao mt-6 flex flex-wrap items-end gap-3 p-5"
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
            <button type="submit" className="btn btn-primario">
              Ver dia
            </button>
            <Link href={`/prazos?data=${dia}`} className="btn-texto px-2 py-3">
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
                processo: item.processo ?? "",
              };
            })}
          />
        </>
      )}
    </section>
  );
}
