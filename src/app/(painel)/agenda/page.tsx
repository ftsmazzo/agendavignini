import Link from "next/link";
import { Suspense } from "react";
import { agruparContatos, buscarContatos } from "@/lib/contatos";
import { dataBr } from "@/lib/datas";

export default function Agenda({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; excluido?: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-xl text-muted">Abrindo a agenda.</p>}
    >
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

async function Lista({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; excluido?: string }>;
}) {
  const { q, excluido } = await searchParams;
  const termo = q?.trim().slice(0, 80) ?? "";
  const itens = await buscarContatos(termo);
  const grupos = agruparContatos(itens);

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl leading-tight font-bold text-ink">Agenda</h1>
        <Link
          href="/agenda/nova"
          className="bg-pen px-4 py-3 text-lg font-semibold text-sheet"
        >
          Adicionar novo
        </Link>
      </div>
      {excluido ? (
        <output className="mt-4 block text-xl text-done">
          Contato excluído.
        </output>
      ) : null}
      <search className="mt-6 block">
        <form method="get">
          <label htmlFor="pesquisar-contato" className="sr-only">
            Pesquisar um contato
          </label>
          <input
            id="pesquisar-contato"
            name="q"
            type="search"
            defaultValue={termo}
            placeholder="Pesquisar um contato"
            className="w-full border border-line bg-sheet px-4 py-3 text-xl text-ink"
          />
        </form>
      </search>
      <p className="mt-4 text-xl text-muted">
        {itens.length === 1 ? "1 contato." : `${itens.length} contatos.`}
      </p>
      {grupos.length === 0 ? (
        <p className="mt-8 text-xl text-ink">Nenhum contato com esse texto.</p>
      ) : (
        grupos.map((grupo) => (
          <section key={grupo.letra} className="mt-8">
            <h2 className="text-3xl font-bold text-ink">{grupo.letra}</h2>
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {grupo.itens.map((item) => (
                <li key={item.id} className="border border-line bg-sheet p-5">
                  <h3 className="text-2xl font-semibold text-ink">
                    {item.nome}
                  </h3>
                  <div className="mt-3 space-y-1 text-xl text-ink">
                    {item.telefone ? <p>{item.telefone}</p> : null}
                    {item.celular ? <p>{item.celular}</p> : null}
                    {item.email ? <p>{item.email}</p> : null}
                    {item.endereco ? <p>{item.endereco}</p> : null}
                    {item.nascimento ? <p>{dataBr(item.nascimento)}</p> : null}
                  </div>
                  <Link
                    href={`/agenda/${item.id}`}
                    className="mt-4 inline-block bg-pen px-4 py-3 text-lg font-semibold text-sheet"
                  >
                    Editar
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}
