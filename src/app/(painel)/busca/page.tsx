import { or, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { obterDb } from "@/db/client";
import { audiencias, prazos } from "@/db/schema";
import { dataBr, dataHoraBr } from "@/lib/datas";
import { rotuloArea } from "@/lib/resumo";

function diaDaAudiencia(valor: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(valor);
}

export default function Busca({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-xl text-muted">Abrindo a busca.</p>}>
      <Resultado searchParams={searchParams} />
    </Suspense>
  );
}

function padrao(termo: string) {
  const limpo = termo.replace(/[\\%_]/g, (caractere) => `\\${caractere}`);
  return `%${limpo}%`;
}

async function Resultado({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const termo = q?.trim().slice(0, 120) ?? "";
  const db = obterDb();
  const filtro = padrao(termo);
  const itens = termo
    ? await db
        .select({
          id: prazos.id,
          area: prazos.area,
          data: prazos.data,
          titulo: prazos.titulo,
          situacao: prazos.situacao,
        })
        .from(prazos)
        .where(
          or(
            sql`${prazos.titulo} ilike ${filtro}`,
            sql`${prazos.observacao} ilike ${filtro}`,
            sql`${prazos.conteudo} ilike ${filtro}`,
          ),
        )
        .orderBy(sql`${prazos.data} desc`, sql`${prazos.id} desc`)
        .limit(80)
    : [];
  const sessoes = termo
    ? await db
        .select({
          id: audiencias.id,
          numeroProcesso: audiencias.numeroProcesso,
          dataHora: audiencias.dataHora,
          vara: audiencias.vara,
          local: audiencias.local,
          reclamante: audiencias.reclamante,
          reclamado: audiencias.reclamado,
        })
        .from(audiencias)
        .where(
          or(
            sql`${audiencias.numeroProcesso} ilike ${filtro}`,
            sql`${audiencias.vara} ilike ${filtro}`,
            sql`${audiencias.local} ilike ${filtro}`,
            sql`${audiencias.reclamante} ilike ${filtro}`,
            sql`${audiencias.reclamado} ilike ${filtro}`,
            sql`${audiencias.preposto} ilike ${filtro}`,
          ),
        )
        .orderBy(sql`${audiencias.dataHora} desc`, sql`${audiencias.id} desc`)
        .limit(40)
    : [];

  return (
    <section className="mx-auto w-full max-w-5xl">
      <h1 className="text-4xl leading-tight font-bold text-ink">
        {termo ? `“${termo}”` : "Pesquisar"}
      </h1>
      <search className="mt-6 block">
        <form method="get">
          <label htmlFor="busca-prazo" className="sr-only">
            Pesquisar prazo ou audiência
          </label>
          <input
            id="busca-prazo"
            name="q"
            type="search"
            defaultValue={termo}
            placeholder="Processo, cliente, parte ou ato"
            className="w-full border border-line bg-sheet px-4 py-3 text-xl text-ink"
          />
        </form>
      </search>
      {!termo ? (
        <p className="mt-6 text-xl text-ink">
          Digite um processo, um cliente ou uma parte na caixa do menu.
        </p>
      ) : itens.length === 0 && sessoes.length === 0 ? (
        <p className="mt-6 text-xl text-ink">
          Nenhum prazo ou audiência com esse texto.
        </p>
      ) : (
        <>
          <h2 className="mt-8 text-3xl font-bold text-ink">Prazos</h2>
          {itens.length === 0 ? (
            <p className="mt-3 text-xl text-ink">
              Nenhum prazo com esse texto.
            </p>
          ) : (
            <>
              <p className="mt-3 text-xl text-muted">
                {itens.length === 80
                  ? "80 prazos mais recentes."
                  : itens.length === 1
                    ? "1 prazo."
                    : `${itens.length} prazos.`}
              </p>
              <ul className="mt-4 divide-y divide-line border border-line bg-sheet">
                {itens.map((item) => (
                  <li key={item.id} className="px-6 py-5">
                    <p className="text-lg text-muted">
                      {rotuloArea(item.area)} · {dataBr(item.data)} ·{" "}
                      {item.situacao === "cumprido" ? "Cumprido" : "Em aberto"}
                    </p>
                    <Link
                      href={`/prazos?data=${item.data}`}
                      className="mt-1 block text-2xl font-semibold text-ink"
                    >
                      {item.titulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h2 className="mt-10 text-3xl font-bold text-ink">Audiências</h2>
          {sessoes.length === 0 ? (
            <p className="mt-3 text-xl text-ink">
              Nenhuma audiência com esse texto.
            </p>
          ) : (
            <>
              <p className="mt-3 text-xl text-muted">
                {sessoes.length === 40
                  ? "40 audiências mais recentes."
                  : sessoes.length === 1
                    ? "1 audiência."
                    : `${sessoes.length} audiências.`}
              </p>
              <ul className="mt-4 divide-y divide-line border border-line bg-sheet">
                {sessoes.map((item) => {
                  const dia = diaDaAudiencia(item.dataHora);
                  return (
                    <li key={item.id} className="px-6 py-5">
                      <p className="text-lg text-hearing">
                        {dataHoraBr(item.dataHora)}
                      </p>
                      <Link
                        href={`/audiencias?data=${dia}`}
                        className="mt-1 block text-2xl font-semibold text-ink"
                      >
                        {item.numeroProcesso || "Sem número"}
                      </Link>
                      <p className="mt-2 text-xl text-ink">
                        {[item.reclamante, item.reclamado]
                          .filter(Boolean)
                          .join(" × ")}
                      </p>
                      <p className="mt-1 text-lg text-muted">
                        {[item.vara, item.local].filter(Boolean).join(" · ")}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
