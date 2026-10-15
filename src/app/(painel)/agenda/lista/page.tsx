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
    <Suspense fallback={<p className="text-muted">Abrindo a lista.</p>}>
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
    <section className="entrada mx-auto w-full max-w-6xl">
      <h1 className="titulo-pagina">Lista de contatos</h1>
      <p className="subtitulo-pagina">
        {itens.length === 1 ? "1 contato." : `${itens.length} contatos.`}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <nav aria-label="Forma da agenda" className="flex flex-wrap gap-2">
          <Link
            href={termo ? `/agenda?q=${encodeURIComponent(termo)}` : "/agenda"}
            className="chip"
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
            className="chip"
          >
            Lista
          </Link>
        </nav>
        <search className="block min-w-60 flex-1">
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
              className="campo"
            />
          </form>
        </search>
      </div>
      {grupos.length > 1 ? (
        <nav aria-label="Letras" className="mt-4 flex flex-wrap gap-2">
          {grupos.map((grupo) => (
            <a
              key={grupo.letra}
              href={`#lista-${grupo.letra}`}
              className="chip min-h-0 px-3 py-1 font-semibold"
            >
              {grupo.letra}
            </a>
          ))}
        </nav>
      ) : null}
      {grupos.length === 0 ? (
        <p className="vazio mt-8">Nenhum contato com esse texto.</p>
      ) : (
        grupos.map((grupo) => (
          <section
            key={grupo.letra}
            id={`lista-${grupo.letra}`}
            className="mt-8 scroll-mt-6"
          >
            <h2 className="flex items-center gap-3 text-2xl font-bold text-pen">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-pen-soft">
                {grupo.letra}
              </span>
              <span className="h-px flex-1 bg-line" aria-hidden />
            </h2>
            <ul className="lista-cartoes mt-3">
              {grupo.itens.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-ink">{item.nome}</p>
                    <NumerosContato
                      telefone={item.telefone}
                      celular={item.celular}
                    />
                    {item.email ? (
                      <p className="break-words text-muted">{item.email}</p>
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
