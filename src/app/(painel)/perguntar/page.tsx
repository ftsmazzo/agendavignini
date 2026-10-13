import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { exigirUsuario } from "@/lib/acesso";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr, dataHoraBr } from "@/lib/datas";
import { responderCarteira } from "@/lib/pergunta";

function diaNoEscritorio(valor: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(valor);
}

const AREAS = {
  administrativo: "Administrativo",
  civil: "Cível",
  trabalhista: "Trabalhista",
} as const;

export default function Perguntar({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-xl text-muted">Abrindo a pergunta.</p>}
    >
      <Resposta searchParams={searchParams} />
    </Suspense>
  );
}

async function Resposta({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await connection();
  await exigirUsuario();
  const { q } = await searchParams;
  const pergunta = q?.trim().slice(0, 240) ?? "";
  const hoje = hojeNoEscritorio();
  const resposta = pergunta ? await responderCarteira(pergunta, hoje) : null;
  const vazia =
    resposta !== null &&
    resposta.termos.length === 0 &&
    resposta.recorte === null;
  const semCitacao =
    resposta !== null &&
    !vazia &&
    resposta.prazos.length === 0 &&
    resposta.audiencias.length === 0;

  return (
    <section className="mx-auto w-full max-w-5xl">
      <h1 className="text-4xl leading-tight font-bold text-ink">Perguntar</h1>
      <p className="mt-3 text-xl text-muted">
        A resposta cita prazo e audiência já gravados. Ela não cria prazo e não
        escreve para cliente.
      </p>
      <search className="mt-6 block">
        <form method="get">
          <label htmlFor="pergunta" className="mb-2 block text-xl text-ink">
            Pergunta
          </label>
          <input
            id="pergunta"
            name="q"
            type="search"
            defaultValue={pergunta}
            placeholder="Prazos da Sylvamo nesta semana"
            className="w-full border border-line bg-sheet px-4 py-3 text-xl text-ink"
          />
        </form>
      </search>
      {!pergunta ? (
        <p className="mt-6 text-xl text-ink">
          Pergunte por um processo, um cliente, um ato ou um período.
        </p>
      ) : null}
      {vazia ? (
        <p className="mt-6 text-xl text-ink">
          Diga o processo, o cliente ou o ato. Um período sozinho também serve,
          como hoje ou outubro.
        </p>
      ) : null}
      {resposta && !vazia ? (
        <p className="mt-6 text-xl text-muted">
          {resposta.recorte
            ? `Recorte ${resposta.recorte}.`
            : "Sem recorte de data."}{" "}
          {resposta.prazos.length + resposta.audiencias.length === 0
            ? ""
            : `${resposta.prazos.length + resposta.audiencias.length} citações.`}
        </p>
      ) : null}
      {semCitacao ? (
        <p className="mt-6 text-xl text-ink">
          Nenhum prazo ou audiência gravados com esse texto.
        </p>
      ) : null}
      {resposta && resposta.prazos.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-ink">
            Prazos ({resposta.prazos.length})
          </h2>
          <ul className="mt-4 divide-y divide-line border border-line bg-sheet">
            {resposta.prazos.map((item) => (
              <li key={item.id} className="px-6 py-5">
                <p className="text-lg text-muted">
                  {AREAS[item.area]} · {dataBr(item.data)} ·{" "}
                  {item.situacao === "cumprido" ? "Cumprido" : "Em aberto"}
                </p>
                <Link
                  href={`/prazos?data=${item.data}`}
                  className="mt-1 block text-2xl font-semibold text-ink"
                >
                  {item.titulo}
                </Link>
                {item.trecho ? (
                  <blockquote className="mt-3 text-xl text-ink">
                    “{item.trecho}”
                  </blockquote>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {resposta && resposta.audiencias.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-ink">
            Audiências ({resposta.audiencias.length})
          </h2>
          <ul className="mt-4 divide-y divide-line border border-line bg-sheet">
            {resposta.audiencias.map((item) => (
              <li key={item.id} className="px-6 py-5">
                <p className="text-lg text-muted">
                  {dataHoraBr(item.dataHora)}
                  {item.vara ? ` · ${item.vara}` : ""}
                </p>
                <Link
                  href={`/audiencias?data=${diaNoEscritorio(item.dataHora)}`}
                  className="mt-1 block text-2xl font-semibold text-ink"
                >
                  {item.numeroProcesso || "Sem número"}
                </Link>
                <p className="mt-3 text-xl text-ink">
                  {[item.reclamante, item.reclamado]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {item.trecho ? (
                  <blockquote className="mt-3 text-xl text-ink">
                    “{item.trecho}”
                  </blockquote>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
