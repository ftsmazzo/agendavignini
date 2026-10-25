import { or, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { ProcessoPrazo } from "@/components/processo-prazo";
import { obterDb } from "@/db/client";
import { audiencias, prazos } from "@/db/schema";
import { dataBr, dataHoraBr } from "@/lib/datas";
import { formatarProcesso } from "@/lib/publicacao";
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
    <Suspense fallback={<p className="text-muted">Abrindo a busca.</p>}>
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
  const formatado = formatarProcesso(termo);
  const consulta = formatado && formatado !== termo ? formatado : termo;
  const db = obterDb();
  const filtro = padrao(consulta);
  const itens = termo
    ? await db
        .select({
          id: prazos.id,
          area: prazos.area,
          data: prazos.data,
          titulo: prazos.titulo,
          situacao: prazos.situacao,
          processo: sql<
            string | null
          >`substring((${prazos.titulo} || ' ' || ${prazos.observacao} || ' ' || ${prazos.conteudo}) from '[0-9]{7}-[0-9]{2}\\.[0-9]{4}\\.[0-9]\\.[0-9]{2}\\.[0-9]{4}')`,
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
          tipo: audiencias.tipo,
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
    <section className="entrada mx-auto w-full max-w-5xl">
      <h1 className="titulo-pagina">{termo ? `“${termo}”` : "Pesquisar"}</h1>
      <p className="subtitulo-pagina">
        Procure em prazos e audiências por processo, cliente, parte ou ato.
      </p>
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
            className="campo"
          />
        </form>
      </search>
      {!termo ? (
        <p className="vazio mt-6">
          Digite um processo, um cliente ou uma parte na caixa do menu.
        </p>
      ) : itens.length === 0 && sessoes.length === 0 ? (
        <p className="vazio mt-6">Nenhum prazo ou audiência com esse texto.</p>
      ) : (
        <>
          <h2 className="titulo-secao mt-8">Prazos</h2>
          {itens.length === 0 ? (
            <p className="vazio mt-3">Nenhum prazo com esse texto.</p>
          ) : (
            <>
              <p className="mt-1 text-muted">
                {itens.length === 80
                  ? "80 prazos mais recentes."
                  : itens.length === 1
                    ? "1 prazo."
                    : `${itens.length} prazos.`}
              </p>
              <ul className="lista-cartoes mt-3">
                {itens.map((item) => (
                  <li key={item.id} className="px-5 py-4">
                    <p className="flex flex-wrap items-center gap-2 text-[0.9375rem] text-muted">
                      <span className="selo">{rotuloArea(item.area)}</span>
                      {dataBr(item.data)}
                      <span
                        className={`selo ${item.situacao === "cumprido" ? "selo-ok" : "selo-neutro"}`}
                      >
                        {item.situacao === "cumprido"
                          ? "Cumprido"
                          : "Em aberto"}
                      </span>
                    </p>
                    <Link
                      href={`/prazos?data=${item.data}`}
                      className="mt-1 block text-lg font-semibold text-ink hover:text-pen"
                    >
                      {item.titulo}
                    </Link>
                    <ProcessoPrazo numero={item.processo} />
                  </li>
                ))}
              </ul>
            </>
          )}
          <h2 className="titulo-secao mt-10">Audiências</h2>
          {sessoes.length === 0 ? (
            <p className="vazio mt-3">Nenhuma audiência com esse texto.</p>
          ) : (
            <>
              <p className="mt-1 text-muted">
                {sessoes.length === 40
                  ? "40 audiências mais recentes."
                  : sessoes.length === 1
                    ? "1 audiência."
                    : `${sessoes.length} audiências.`}
              </p>
              <ul className="lista-cartoes mt-3">
                {sessoes.map((item) => {
                  const dia = diaDaAudiencia(item.dataHora);
                  return (
                    <li key={item.id} className="px-5 py-4">
                      <p>
                        <span className="selo selo-audiencia">
                          {dataHoraBr(item.dataHora)}
                        </span>
                        {item.tipo === "pericia" ? (
                          <span className="selo">Perícia</span>
                        ) : null}
                      </p>
                      <Link
                        href={`/audiencias?data=${dia}`}
                        className="mt-1 block text-lg font-semibold text-ink hover:text-pen"
                      >
                        {item.numeroProcesso || "Sem número"}
                      </Link>
                      <p className="mt-1 text-base text-ink">
                        {[item.reclamante, item.reclamado]
                          .filter(Boolean)
                          .join(" × ")}
                      </p>
                      <p className="mt-1 text-[0.9375rem] text-muted">
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
