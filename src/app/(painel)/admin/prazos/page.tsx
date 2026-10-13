import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { classeCampo } from "@/components/campo";
import { obterDb } from "@/db/client";
import { prazos } from "@/db/schema";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr, dataIsoValida } from "@/lib/datas";

export default function ListarPrazosAdmin({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; excluido?: string }>;
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
  searchParams: Promise<{ data?: string; excluido?: string }>;
}) {
  const { data, excluido } = await searchParams;
  const hoje = hojeNoEscritorio();
  const dia = data && dataIsoValida(data) ? data : hoje;
  const db = obterDb();
  const itens = await db
    .select({
      id: prazos.id,
      area: prazos.area,
      titulo: prazos.titulo,
      situacao: prazos.situacao,
    })
    .from(prazos)
    .where(and(eq(prazos.data, dia)))
    .orderBy(asc(prazos.id))
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
            <li key={item.id} className="px-6 py-5">
              <p className="text-lg text-muted">
                {item.area} ·{" "}
                {item.situacao === "cumprido" ? "Cumprido" : "Em aberto"}
              </p>
              <Link
                href={`/admin/prazos/${item.id}`}
                className="mt-1 block text-2xl font-semibold text-pen underline"
              >
                {item.titulo}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
