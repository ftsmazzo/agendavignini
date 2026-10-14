import Link from "next/link";
import { Suspense } from "react";
import { AcoesContato, NumerosContato } from "@/components/acoes-contato";
import { agruparContatos, buscarContatos } from "@/lib/contatos";

export default function ListaAgenda({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-xl text-muted">Abrindo a lista.</p>}>
      <Tabela searchParams={searchParams} />
    </Suspense>
  );
}

async function Tabela({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const termo = q?.trim().slice(0, 80) ?? "";
  const itens = await buscarContatos(termo);
  const grupos = agruparContatos(itens);

  return (
    <section className="w-full">
      <h1 className="text-4xl leading-tight font-bold text-ink">
        Lista de contatos
      </h1>
      <nav aria-label="Forma da agenda" className="mt-6 flex flex-wrap gap-2">
        <Link
          href={termo ? `/agenda?q=${encodeURIComponent(termo)}` : "/agenda"}
          className="border border-line bg-sheet px-3 py-2 text-lg text-ink"
        >
          Por letra
        </Link>
        <Link
          href={
            termo
              ? `/agenda/lista?q=${encodeURIComponent(termo)}`
              : "/agenda/lista"
          }
          aria-current="page"
          className="bg-pen px-3 py-2 text-lg font-semibold text-sheet"
        >
          Lista
        </Link>
      </nav>
      <search className="mt-6 block">
        <form method="get">
          <label htmlFor="filtrar-contato" className="sr-only">
            Filtrar contatos
          </label>
          <input
            id="filtrar-contato"
            name="q"
            type="search"
            defaultValue={termo}
            placeholder="Nome, telefone ou e-mail"
            className="w-full border border-line bg-sheet px-4 py-3 text-xl text-ink"
          />
        </form>
      </search>
      <p className="mt-4 text-xl text-muted">
        {itens.length === 1 ? "1 contato." : `${itens.length} contatos.`}
      </p>
      {grupos.length > 1 ? (
        <nav aria-label="Letras" className="mt-4 flex flex-wrap gap-2">
          {grupos.map((grupo) => (
            <a
              key={grupo.letra}
              href={`#lista-${grupo.letra}`}
              className="border border-line bg-sheet px-3 py-1 text-lg font-semibold text-ink"
            >
              {grupo.letra}
            </a>
          ))}
        </nav>
      ) : null}
      {grupos.length === 0 ? (
        <p className="mt-8 text-xl text-ink">Nenhum contato com esse texto.</p>
      ) : (
        grupos.map((grupo) => (
          <section
            key={grupo.letra}
            id={`lista-${grupo.letra}`}
            className="mt-8"
          >
            <h2 className="text-3xl font-bold text-ink">{grupo.letra}</h2>
            <ul className="mt-3 divide-y divide-line border border-line bg-sheet">
              {grupo.itens.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-xl font-semibold text-ink">
                      {item.nome}
                    </p>
                    <NumerosContato
                      telefone={item.telefone}
                      celular={item.celular}
                    />
                    {item.email ? (
                      <p className="text-lg text-muted">{item.email}</p>
                    ) : null}
                  </div>
                  <AcoesContato id={item.id} email={item.email} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}
