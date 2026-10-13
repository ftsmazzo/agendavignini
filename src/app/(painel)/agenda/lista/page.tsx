import Link from "next/link";
import { Suspense } from "react";
import { buscarContatos } from "@/lib/contatos";

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

  return (
    <section className="mx-auto w-full max-w-5xl">
      <h1 className="text-4xl leading-tight font-bold text-ink">
        Lista de contatos
      </h1>
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
      <div className="mt-6 overflow-x-auto border border-line bg-sheet">
        <table className="w-full border-collapse text-left text-xl">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Telefone</th>
              <th className="px-4 py-3 font-semibold">E-mail</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr
                key={item.id}
                className="border-b border-line last:border-b-0"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/agenda/${item.id}`}
                    className="text-pen underline"
                  >
                    {item.nome}
                  </Link>
                </td>
                <td className="px-4 py-3">{item.telefone}</td>
                <td className="px-4 py-3">{item.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {itens.length === 0 ? (
        <p className="mt-6 text-xl text-ink">Nenhum contato com esse texto.</p>
      ) : null}
    </section>
  );
}
