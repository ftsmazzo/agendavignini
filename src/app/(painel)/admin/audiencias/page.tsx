import Link from "next/link";
import { Suspense } from "react";
import { classeCampo } from "@/components/campo";
import { listarAudiencias } from "@/lib/audiencias";
import { dataHoraBr, dataIsoValida } from "@/lib/datas";

export default function ListarAudienciasAdmin({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; excluido?: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-xl text-muted">Abrindo as audiências.</p>}
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
  const dia = data && dataIsoValida(data) ? data : null;
  const itens = await listarAudiencias(dia);

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl leading-tight font-bold text-ink">
          Listar audiências
        </h1>
        <Link
          href="/admin/audiencias/nova"
          className="bg-pen px-4 py-3 text-lg font-semibold text-sheet"
        >
          Adicionar nova
        </Link>
      </div>
      {excluido ? (
        <output className="mt-4 block text-xl text-done">
          Audiência excluída.
        </output>
      ) : null}
      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="data-audiencia"
            className="mb-2 block text-xl text-ink"
          >
            Ver um dia
          </label>
          <input
            id="data-audiencia"
            name="data"
            type="date"
            defaultValue={dia ?? ""}
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
      {itens.length === 0 ? (
        <p className="mt-8 text-xl text-ink">
          Nenhuma audiência neste recorte.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line border border-line bg-sheet">
          {itens.map((item) => (
            <li key={item.id} className="px-6 py-5">
              <p className="text-lg text-muted">{dataHoraBr(item.dataHora)}</p>
              <Link
                href={`/admin/audiencias/${item.id}`}
                className="mt-1 block text-2xl font-semibold text-pen underline"
              >
                {item.numeroProcesso || item.vara || "Audiência"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
