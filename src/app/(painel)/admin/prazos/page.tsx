import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { classeCampo } from "@/components/campo";
import { obterDb } from "@/db/client";
import { prazos, usuarios } from "@/db/schema";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr, dataIsoValida } from "@/lib/datas";
import { faixaDaArea, rotuloArea, statusDoPrazo } from "@/lib/resumo";

export default function ListarPrazosAdmin({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; ano?: string; excluido?: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-xl text-muted">Abrindo os prazos.</p>}
    >
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

async function Lista({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; ano?: string; excluido?: string }>;
}) {
  const { data, ano, excluido } = await searchParams;
  await connection();
  const hoje = hojeNoEscritorio();
  const dia = data && dataIsoValida(data) ? data : null;
  const db = obterDb();
  if (!dia) {
    const anoAtual = Number(hoje.slice(0, 4));
    const anoPedido = ano && /^\d{4}$/.test(ano) ? Number(ano) : anoAtual;
    const anos = await db
      .select({
        ano: sql<number>`extract(year from ${prazos.data})::int`,
      })
      .from(prazos)
      .where(isNotNull(prazos.data))
      .groupBy(sql`extract(year from ${prazos.data})`)
      .orderBy(desc(sql`extract(year from ${prazos.data})`));
    const datas = await db
      .select({
        data: prazos.data,
        total: sql<number>`count(*)::int`,
      })
      .from(prazos)
      .where(
        and(
          isNotNull(prazos.data),
          sql`extract(year from ${prazos.data}) = ${anoPedido}`,
        ),
      )
      .groupBy(prazos.data)
      .orderBy(desc(prazos.data));

    return (
      <section className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-4xl leading-tight font-bold text-ink">
            Prazos por data
          </h1>
          <Link
            href="/admin/prazos/novo"
            className="bg-pen px-4 py-3 text-lg font-semibold text-sheet"
          >
            Adicionar novo
          </Link>
        </div>
        <nav aria-label="Anos" className="mt-6 flex flex-wrap gap-2">
          {anos.map((item) => (
            <Link
              key={item.ano}
              href={`/admin/prazos?ano=${item.ano}`}
              aria-current={item.ano === anoPedido ? "page" : undefined}
              className={
                item.ano === anoPedido
                  ? "bg-pen px-3 py-2 text-lg font-semibold text-sheet"
                  : "border border-line bg-sheet px-3 py-2 text-lg text-ink"
              }
            >
              {item.ano}
            </Link>
          ))}
        </nav>
        <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="data" className="mb-2 block text-xl text-ink">
              Ir para uma data
            </label>
            <input id="data" name="data" type="date" className={classeCampo} />
          </div>
          <button
            type="submit"
            className="border border-line bg-sheet px-4 py-3 text-xl font-semibold text-ink"
          >
            Ver
          </button>
        </form>
        <p className="mt-4 text-xl text-muted">
          {datas.length === 1 ? "1 data." : `${datas.length} datas.`}
        </p>
        {datas.length === 0 ? (
          <p className="mt-8 text-xl text-ink">Nenhum prazo neste ano.</p>
        ) : (
          <ul className="mt-6 divide-y divide-line border border-line bg-sheet">
            {datas.map((item) => (
              <li key={item.data}>
                <Link
                  href={`/admin/prazos?data=${item.data}`}
                  className="flex items-center justify-between gap-4 px-6 py-4 text-xl text-ink"
                >
                  <span>{item.data ? dataBr(item.data) : ""}</span>
                  <span className="font-semibold">{item.total}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }
  const itens = await db
    .select({
      id: prazos.id,
      area: prazos.area,
      titulo: prazos.titulo,
      situacao: prazos.situacao,
      observacao: prazos.observacao,
      conteudo: prazos.conteudo,
      cumpridoNome: usuarios.nome,
      cumpridoSobrenome: usuarios.sobrenome,
      cumpridoEm: prazos.cumpridoEm,
    })
    .from(prazos)
    .leftJoin(usuarios, eq(usuarios.id, prazos.cumpridoPorId))
    .where(eq(prazos.data, dia))
    .orderBy(
      sql`case ${prazos.area} when 'administrativo' then 1 when 'civil' then 2 else 3 end`,
      asc(prazos.titulo),
      asc(prazos.id),
    )
    .limit(300);

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl leading-tight font-bold text-ink">
          Prazos de {dataBr(dia)}
        </h1>
        <Link
          href="/admin/prazos/novo"
          className="bg-pen px-4 py-3 text-lg font-semibold text-sheet"
        >
          Adicionar novo
        </Link>
      </div>
      {excluido ? (
        <output className="mt-4 block text-xl text-done">
          Prazo excluído.
        </output>
      ) : null}
      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="data" className="mb-2 block text-xl text-ink">
            Data
          </label>
          <input
            id="data"
            name="data"
            type="date"
            defaultValue={dia}
            className={classeCampo}
          />
        </div>
        <button
          type="submit"
          className="border border-line bg-sheet px-4 py-3 text-xl font-semibold text-ink"
        >
          Ver
        </button>
      </form>
      <p className="mt-4">
        <Link
          href={`/admin/prazos?ano=${dia.slice(0, 4)}`}
          className="text-lg text-pen"
        >
          Todas as datas
        </Link>
      </p>
      <p className="mt-4 text-xl text-muted">
        {itens.length === 300
          ? "Mostrando os 300 primeiros."
          : `${itens.length} nesta data.`}
      </p>
      {itens.length === 0 ? (
        <p className="mt-8 text-xl text-ink">Nenhum prazo nesta data.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line border border-line bg-sheet">
          {itens.map((item) => (
            <li key={item.id} className={`px-6 py-5 ${faixaDaArea(item.area)}`}>
              <p className="text-lg text-muted">
                {rotuloArea(item.area)} ·{" "}
                {statusDoPrazo({
                  situacao: item.situacao,
                  cumpridoPor: item.cumpridoNome
                    ? `${item.cumpridoNome} ${item.cumpridoSobrenome ?? ""}`.trim()
                    : null,
                  cumpridoEm: item.cumpridoEm,
                })}
              </p>
              <Link
                href={`/admin/prazos/${item.id}`}
                className="mt-1 block text-2xl font-semibold text-pen underline"
              >
                {item.titulo}
              </Link>
              {item.observacao ? (
                <p className="mt-3 text-xl whitespace-pre-wrap text-ink">
                  {item.observacao}
                </p>
              ) : null}
              {item.conteudo ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-lg text-pen">
                    Ver publicação
                  </summary>
                  <p className="mt-3 text-lg whitespace-pre-wrap text-ink">
                    {item.conteudo}
                  </p>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
