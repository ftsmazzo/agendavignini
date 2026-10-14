import Link from "next/link";
import { Suspense } from "react";
import { classeCampo } from "@/components/campo";
import {
  anosDasAudiencias,
  listarAudiencias,
  listarAudienciasAdmin,
} from "@/lib/audiencias";
import { dataBr, dataHoraBr, dataIsoValida } from "@/lib/datas";

export default function ListarAudienciasAdmin({
  searchParams,
}: {
  searchParams: Promise<{
    data?: string;
    ano?: string;
    q?: string;
    excluido?: string;
  }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-xl text-muted">Abrindo as audiências.</p>}
    >
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

function partes(reclamante: string | null, reclamado: string | null) {
  return [reclamante, reclamado].filter(Boolean).join(" × ");
}

async function Lista({
  searchParams,
}: {
  searchParams: Promise<{
    data?: string;
    ano?: string;
    q?: string;
    excluido?: string;
  }>;
}) {
  const { data, ano, q, excluido } = await searchParams;
  const dia = data && dataIsoValida(data) ? data : null;
  const termo = q?.trim().slice(0, 120) ?? "";
  const anos = await anosDasAudiencias();
  const anoPedido =
    ano && /^\d{4}$/.test(ano) ? Number(ano) : (anos[0]?.ano ?? null);
  const doDia = dia ? await listarAudiencias(dia, 0) : [];
  const itens = dia
    ? []
    : await listarAudienciasAdmin({
        ano: termo ? null : anoPedido,
        termo,
      });

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl leading-tight font-bold text-ink">
          {dia ? `Audiências de ${dataBr(dia)}` : "Listar audiências"}
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
      {dia ? null : (
        <nav aria-label="Anos" className="mt-6 flex flex-wrap gap-2">
          {anos.map((item) => (
            <Link
              key={item.ano}
              href={`/admin/audiencias?ano=${item.ano}`}
              aria-current={
                !termo && item.ano === anoPedido ? "page" : undefined
              }
              className={
                !termo && item.ano === anoPedido
                  ? "bg-pen px-3 py-2 text-lg font-semibold text-sheet"
                  : "border border-line bg-sheet px-3 py-2 text-lg text-ink"
              }
            >
              {item.ano}
            </Link>
          ))}
        </nav>
      )}
      <search className="mt-6 block">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <label
              htmlFor="buscar-audiencia"
              className="mb-2 block text-xl text-ink"
            >
              Processo, parte ou local
            </label>
            <input
              id="buscar-audiencia"
              name="q"
              type="search"
              defaultValue={termo}
              className={classeCampo}
            />
          </div>
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
      </search>
      {dia ? (
        <p className="mt-4">
          <Link
            href={`/admin/audiencias?ano=${dia.slice(0, 4)}`}
            className="text-lg text-pen"
          >
            Todas as audiências
          </Link>
        </p>
      ) : null}
      <p className="mt-4 text-xl text-muted">
        {dia
          ? `${doDia.length} neste dia.`
          : termo
            ? itens.length === 80
              ? "80 primeiras em todos os anos."
              : `${itens.length} em todos os anos.`
            : `${itens.length} em ${anoPedido ?? "todos os anos"}.`}
      </p>
      {(dia ? doDia : itens).length === 0 ? (
        <p className="mt-8 text-xl text-ink">
          Nenhuma audiência neste recorte.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line border border-line bg-sheet">
          {(dia ? doDia : itens).map((item) => (
            <li key={item.id} className="px-6 py-5">
              <p className="text-lg text-muted">{dataHoraBr(item.dataHora)}</p>
              <Link
                href={`/admin/audiencias/${item.id}`}
                className="mt-1 block text-2xl font-semibold text-pen underline"
              >
                {item.numeroProcesso || "Sem número"}
              </Link>
              <p className="mt-2 text-xl text-ink">
                {[item.local, item.vara].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-1 text-xl text-ink">
                {partes(item.reclamante, item.reclamado)}
              </p>
              {item.preposto ? (
                <p className="mt-1 text-lg text-muted">
                  Preposto: {item.preposto}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
