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
    <Suspense fallback={<p className="text-muted">Abrindo a pergunta.</p>}>
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
    <section className="entrada mx-auto w-full max-w-5xl">
      <h1 className="titulo-pagina">Perguntar</h1>
      <p className="subtitulo-pagina">
        A resposta cita prazo e audiência já gravados. Ela não cria prazo e não
        escreve para cliente.
      </p>
      <search className="cartao mt-6 block p-5">
        <form method="get">
          <label htmlFor="pergunta" className="rotulo-campo">
            Pergunta
          </label>
          <input
            id="pergunta"
            name="q"
            type="search"
            defaultValue={pergunta}
            placeholder="Prazos da Sylvamo nesta semana"
            className="campo"
          />
        </form>
      </search>
      {!pergunta ? (
        <p className="vazio mt-6">
          Pergunte por um processo, um cliente, um ato ou um período.
        </p>
      ) : null}
      {vazia ? (
        <p className="aviso mt-6">
          Diga o processo, o cliente ou o ato. Um período sozinho também serve,
          como hoje ou outubro.
        </p>
      ) : null}
      {resposta && !vazia ? (
        <p className="mt-6 flex flex-wrap items-center gap-2 text-muted">
          <span className="selo">
            {resposta.recorte
              ? `Recorte ${resposta.recorte}.`
              : "Sem recorte de data."}
          </span>
          {resposta.prazos.length + resposta.audiencias.length === 0 ? null : (
            <span className="selo selo-neutro">
              {resposta.prazos.length + resposta.audiencias.length} citações.
            </span>
          )}
        </p>
      ) : null}
      {semCitacao ? (
        <p className="vazio mt-6">
          Nenhum prazo ou audiência gravados com esse texto.
        </p>
      ) : null}
      {resposta && resposta.prazos.length > 0 ? (
        <div className="mt-8">
          <h2 className="titulo-secao">Prazos ({resposta.prazos.length})</h2>
          <ul className="lista-cartoes mt-3">
            {resposta.prazos.map((item) => (
              <li key={item.id} className="px-5 py-4">
                <p className="flex flex-wrap items-center gap-2 text-[0.9375rem] text-muted">
                  <span className="selo">{AREAS[item.area]}</span>
                  {dataBr(item.data)}
                  <span
                    className={`selo ${item.situacao === "cumprido" ? "selo-ok" : "selo-neutro"}`}
                  >
                    {item.situacao === "cumprido" ? "Cumprido" : "Em aberto"}
                  </span>
                </p>
                <Link
                  href={`/prazos?data=${item.data}`}
                  className="mt-1 block text-lg font-semibold text-ink hover:text-pen"
                >
                  {item.titulo}
                </Link>
                {item.trecho ? (
                  <blockquote className="mt-3 rounded-r-xl border-l-4 border-pen bg-paper px-4 py-3 text-base text-ink">
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
          <h2 className="titulo-secao">
            Audiências ({resposta.audiencias.length})
          </h2>
          <ul className="lista-cartoes mt-3">
            {resposta.audiencias.map((item) => (
              <li key={item.id} className="px-5 py-4">
                <p className="flex flex-wrap items-center gap-2 text-[0.9375rem] text-muted">
                  <span className="selo selo-audiencia">
                    {dataHoraBr(item.dataHora)}
                  </span>
                  {item.vara ? item.vara : null}
                </p>
                <Link
                  href={`/audiencias?data=${diaNoEscritorio(item.dataHora)}`}
                  className="mt-1 block text-lg font-semibold text-ink hover:text-pen"
                >
                  {item.numeroProcesso || "Sem número"}
                </Link>
                <p className="mt-2 text-base text-ink">
                  {[item.reclamante, item.reclamado]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {item.trecho ? (
                  <blockquote className="mt-3 rounded-r-xl border-l-4 border-pen bg-paper px-4 py-3 text-base text-ink">
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
