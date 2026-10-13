import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { classeCampo } from "@/components/campo";
import { exigirUsuario } from "@/lib/acesso";
import { listarAudiencias, listarAudienciasDaSemana } from "@/lib/audiencias";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr, dataHoraBr, dataIsoValida, semanaDe } from "@/lib/datas";

function rotuloDia(iso: string) {
  const semana = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${iso}T12:00:00-03:00`));
  return `${semana} ${dataBr(iso).slice(0, 5)}`;
}

export default function Audiencias({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; semana?: string; lista?: string }>;
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
  searchParams: Promise<{ data?: string; semana?: string; lista?: string }>;
}) {
  const { data, semana, lista } = await searchParams;
  await connection();
  const usuario = await exigirUsuario();
  const dia = data && dataIsoValida(data) ? data : null;
  const hoje = hojeNoEscritorio();
  if (!dia && lista !== "1") {
    const ancora = semana && dataIsoValida(semana) ? semana : hoje;
    const quadro = await listarAudienciasDaSemana(ancora, usuario.id);
    const estaSemana = semanaDe(hoje).inicio === quadro.inicio;
    return (
      <section className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/audiencias?semana=${quadro.anterior}`}
            className="border border-line bg-sheet px-4 py-3 text-lg font-semibold text-ink"
          >
            Semana anterior
          </Link>
          <h1 className="text-center text-4xl leading-tight font-bold text-ink">
            Semana de {dataBr(quadro.inicio)} a {dataBr(quadro.sexta)}
          </h1>
          <Link
            href={`/audiencias?semana=${quadro.proxima}`}
            className="border border-line bg-sheet px-4 py-3 text-lg font-semibold text-ink"
          >
            Próxima semana
          </Link>
        </div>
        <p className="mt-4 flex flex-wrap gap-4 text-lg">
          {estaSemana ? null : (
            <Link href="/audiencias" className="text-pen underline">
              Esta semana
            </Link>
          )}
          <Link href="/audiencias?lista=1" className="text-pen underline">
            Próximas
          </Link>
          <Link
            href={`/audiencias/impressao?data=${quadro.inicio}`}
            className="text-pen underline"
          >
            Imprimir a semana
          </Link>
          {usuario.papel === "admin" ? (
            <Link href="/admin/audiencias/nova" className="text-pen underline">
              Adicionar nova
            </Link>
          ) : null}
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-5">
          {quadro.dias.map((coluna) => {
            const doDia = quadro.itens.filter((item) => item.dia === coluna);
            return (
              <section
                key={coluna}
                className={
                  coluna === hoje
                    ? "border-2 border-pen bg-sheet p-3"
                    : "border border-line bg-sheet p-3"
                }
              >
                <h2 className="text-xl font-bold text-ink">
                  <Link
                    href={`/audiencias?data=${coluna}`}
                    className="text-pen"
                  >
                    {rotuloDia(coluna)} · {doDia.length}
                  </Link>
                </h2>
                {doDia.length === 0 ? (
                  <p className="mt-4 text-lg text-muted">Nenhuma</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {doDia.map((item) => (
                      <li
                        key={item.id}
                        className={
                          item.minha
                            ? "border border-hearing p-3"
                            : "border border-line p-3"
                        }
                      >
                        <p className="text-xl font-bold text-hearing">
                          {item.hora}
                          {item.minha ? " · Sua" : ""}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-ink">
                          {item.numeroProcesso || "Sem número"}
                        </p>
                        <p className="mt-1 text-lg text-ink">
                          {[item.reclamante, item.reclamado]
                            .filter(Boolean)
                            .join(" × ")}
                        </p>
                        <p className="mt-1 text-lg text-muted">
                          {[item.vara, item.local].filter(Boolean).join(" · ")}
                        </p>
                        {item.preposto ? (
                          <p className="mt-1 text-lg text-muted">
                            Preposto: {item.preposto}
                          </p>
                        ) : null}
                        {item.advogados.length > 0 ? (
                          <p className="mt-1 text-lg text-muted">
                            {item.advogados.join(", ")}
                          </p>
                        ) : null}
                        {item.observacao ? (
                          <p className="mt-2 text-lg whitespace-pre-wrap text-ink">
                            {item.observacao}
                          </p>
                        ) : null}
                        {usuario.papel === "admin" ? (
                          <Link
                            href={`/admin/audiencias/${item.id}`}
                            className="mt-2 inline-block text-lg text-pen underline"
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
          })}
        </div>
      </section>
    );
  }
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
        <Link
          href={dia ? `/audiencias?semana=${dia}` : "/audiencias"}
          className="px-2 py-3 text-lg text-pen underline"
        >
          Ver a semana
        </Link>
        {dia ? (
          <Link
            href="/audiencias?lista=1"
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
