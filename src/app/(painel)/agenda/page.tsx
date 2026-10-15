import Link from "next/link";
import { Suspense } from "react";
import { AcoesContato, NumerosContato } from "@/components/acoes-contato";
import { agruparContatos, buscarContatos } from "@/lib/contatos";
import { dataBr } from "@/lib/datas";

export default function Agenda({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; excluido?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-muted">Abrindo a agenda.</p>}>
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
    <section className="entrada mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="titulo-pagina">Agenda</h1>
          <p className="subtitulo-pagina">
            {itens.length === 1 ? "1 contato." : `${itens.length} contatos.`}
          </p>
        </div>
        <Link href="/agenda/nova" className="btn btn-primario">
          + Adicionar novo
        </Link>
      </div>
      {excluido ? (
        <output className="aviso aviso-ok mt-4 block">Contato excluído.</output>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <nav aria-label="Forma da agenda" className="flex flex-wrap gap-2">
          <Link
            href={termo ? `/agenda?q=${encodeURIComponent(termo)}` : "/agenda"}
            aria-current="page"
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
            className="chip"
          >
            Lista
          </Link>
        </nav>
        <search className="block min-w-60 flex-1">
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
              href={`#letra-${grupo.letra}`}
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
            id={`letra-${grupo.letra}`}
            className="mt-8 scroll-mt-6"
          >
            <h2 className="flex items-center gap-3 text-2xl font-bold text-pen">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-pen-soft">
                {grupo.letra}
              </span>
              <span className="h-px flex-1 bg-line" aria-hidden />
            </h2>
            <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {grupo.itens.map((item) => (
                <li key={item.id} className="cartao p-5">
                  <h3 className="text-lg font-bold text-ink">{item.nome}</h3>
                  <div className="mt-3 space-y-2 text-ink">
                    <NumerosContato
                      telefone={item.telefone}
                      celular={item.celular}
                    />
                    {item.email ? (
                      <p className="break-words text-muted">{item.email}</p>
                    ) : null}
                    {item.endereco ? (
                      <p className="text-muted">{item.endereco}</p>
                    ) : null}
                    {item.nascimento ? (
                      <p className="text-muted">{dataBr(item.nascimento)}</p>
                    ) : null}
                  </div>
                  <div className="mt-4">
                    <AcoesContato id={item.id} email={item.email} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}
