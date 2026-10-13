import Link from "next/link";
import { Suspense } from "react";
import { classeCampo } from "@/components/campo";
import { exigirUsuario } from "@/lib/acesso";
import { listarAudiencias } from "@/lib/audiencias";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataHoraBr, dataIsoValida } from "@/lib/datas";

export default function Audiencias({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
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
  searchParams: Promise<{ data?: string }>;
}) {
  const { data } = await searchParams;
  const usuario = await exigirUsuario();
  const dia = data && dataIsoValida(data) ? data : null;
  const itens = await listarAudiencias(dia);

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl leading-tight font-bold text-ink">
          Audiências
        </h1>
        {usuario.papel === "admin" ? (
          <Link
            href="/admin/audiencias/nova"
            className="bg-pen px-4 py-3 text-lg font-semibold text-sheet"
          >
            Adicionar nova
          </Link>
        ) : null}
      </div>
      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="data" className="mb-2 block text-xl text-ink">
            Ver um dia
          </label>
          <input
            id="data"
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
        {dia ? (
          <Link
            href="/audiencias"
            className="px-2 py-3 text-lg text-pen underline"
          >
            Próximas
          </Link>
        ) : null}
        <Link
          href={`/audiencias/impressao?data=${dia ?? hojeNoEscritorio()}`}
          className="px-2 py-3 text-lg text-pen underline"
        >
          Imprimir a semana
        </Link>
      </form>
      <p className="mt-4 text-xl text-muted">
        {dia
          ? `${itens.length} neste dia.`
          : itens.length === 150
            ? "Mostrando as 150 próximas."
            : `${itens.length} a partir de hoje.`}
      </p>
      {itens.length === 0 ? (
        <p className="mt-8 text-xl text-ink">
          Nenhuma audiência neste recorte.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line border border-line bg-sheet">
          {itens.map((item) => (
            <li key={item.id} className="px-6 py-5">
              <p className="text-lg text-hearing">
                {dataHoraBr(item.dataHora)}
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-ink">
                {item.numeroProcesso || "Sem número"}
              </h2>
              <p className="mt-2 text-xl text-ink">
                {[item.vara, item.local].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-2 text-xl text-ink">
                {[item.reclamante, item.reclamado].filter(Boolean).join(" × ")}
              </p>
              {item.preposto ? (
                <p className="mt-2 text-lg text-muted">
                  Preposto: {item.preposto}
                </p>
              ) : null}
              {item.advogados.length > 0 ? (
                <p className="mt-2 text-lg text-muted">
                  {item.advogados.join(", ")}
                </p>
              ) : null}
              {item.observacao ? (
                <p className="mt-3 text-xl whitespace-pre-wrap text-ink">
                  {item.observacao}
                </p>
              ) : null}
              {usuario.papel === "admin" ? (
                <Link
                  href={`/admin/audiencias/${item.id}`}
                  className="mt-4 inline-block border border-line bg-sheet px-4 py-2 text-lg font-semibold text-ink"
                >
                  Editar
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
