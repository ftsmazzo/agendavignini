import { or, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { obterDb } from "@/db/client";
import { prazos } from "@/db/schema";
import { dataBr } from "@/lib/datas";

export default function Busca({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-xl text-muted">Abrindo a busca.</p>}>
      <Resultado searchParams={searchParams} />
    </Suspense>
  );
}

function padrao(termo: string) {
  const limpo = termo.replace(/[\\%_]/g, (caractere) => `\\${caractere}`);
  return `%${limpo}%`;
}

async function Resultado({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const termo = q?.trim().slice(0, 120) ?? "";
  const db = obterDb();
  const itens = termo
    ? await db
        .select({
          id: prazos.id,
          area: prazos.area,
          data: prazos.data,
          titulo: prazos.titulo,
          situacao: prazos.situacao,
        })
        .from(prazos)
        .where(
          or(
            sql`${prazos.titulo} ilike ${padrao(termo)}`,
            sql`${prazos.observacao} ilike ${padrao(termo)}`,
            sql`${prazos.conteudo} ilike ${padrao(termo)}`,
          ),
        )
        .orderBy(sql`${prazos.data} desc`, sql`${prazos.id} desc`)
        .limit(80)
    : [];

  return (
    <section className="mx-auto w-full max-w-5xl">
      <h1 className="text-4xl leading-tight font-bold text-ink">
        {termo ? `“${termo}”` : "Pesquisar um prazo"}
      </h1>
      <search className="mt-6 block">
        <form method="get">
          <label htmlFor="busca-prazo" className="sr-only">
            Pesquisar um prazo
          </label>
          <input
            id="busca-prazo"
            name="q"
            type="search"
            defaultValue={termo}
            placeholder="Processo, cliente ou ato"
            className="w-full border border-line bg-sheet px-4 py-3 text-xl text-ink"
          />
        </form>
      </search>
      {!termo ? (
        <p className="mt-6 text-xl text-ink">
          Digite um processo, um cliente ou um ato na caixa do menu.
        </p>
      ) : itens.length === 0 ? (
        <p className="mt-6 text-xl text-ink">Nenhum prazo com esse texto.</p>
      ) : (
        <>
          <p className="mt-4 text-xl text-muted">
            {itens.length === 80
              ? "Mostrando os 80 mais recentes."
              : `${itens.length} encontrados.`}
          </p>
          <ul className="mt-6 divide-y divide-line border border-line bg-sheet">
            {itens.map((item) => (
              <li key={item.id} className="px-6 py-5">
                <p className="text-lg text-muted">
                  {item.area} · {dataBr(item.data)} ·{" "}
                  {item.situacao === "cumprido" ? "Cumprido" : "Em aberto"}
                </p>
                <Link
                  href={`/prazos?data=${item.data}`}
                  className="mt-1 block text-2xl font-semibold text-ink"
                >
                  {item.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
