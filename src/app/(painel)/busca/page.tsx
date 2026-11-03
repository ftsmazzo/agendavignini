import { and, eq, or, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import {
  cumprir,
  desfazer,
  excluirPrazo,
} from "@/app/(painel)/admin/prazos/actions";
import { BotaoCumprir } from "@/components/botao-cumprir";
import { BotaoExcluir } from "@/components/botao-excluir";
import { ProcessoPrazo } from "@/components/processo-prazo";
import { obterDb } from "@/db/client";
import { audiencias, prazos } from "@/db/schema";
import { exigirUsuario } from "@/lib/acesso";
import { dataBr, dataHoraBr } from "@/lib/datas";
import { formatarProcesso } from "@/lib/publicacao";
import { faixaDaArea, prazoEhDefesa, rotuloArea } from "@/lib/resumo";

function diaDaAudiencia(valor: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(valor);
}

function textoEncaixado(valor: string) {
  const limpo = valor.trim();
  if (limpo.length <= 420) {
    return limpo;
  }
  return `${limpo.slice(0, 420).trimEnd()}…`;
}

function consultaBusca(termo: string, situacao?: string) {
  const params = new URLSearchParams();
  if (termo) {
    params.set("q", termo);
  }
  if (situacao === "aberto" || situacao === "cumprido") {
    params.set("situacao", situacao);
  }
  const texto = params.toString();
  return texto ? `/busca?${texto}` : "/busca";
}

export default function Busca({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; situacao?: string }>;
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
  searchParams: Promise<{ q?: string; situacao?: string }>;
}) {
  const { q, situacao } = await searchParams;
  const termo = q?.trim().slice(0, 120) ?? "";
  const situacaoOk =
    situacao === "aberto" || situacao === "cumprido" ? situacao : null;
  const formatado = formatarProcesso(termo);
  const consulta = formatado && formatado !== termo ? formatado : termo;
  const usuario = await exigirUsuario();
  const admin = usuario.papel === "admin";
  const voltar = consultaBusca(termo, situacaoOk ?? undefined);
  const db = obterDb();
  const filtro = padrao(consulta);
  const filtroTexto = or(
    sql`${prazos.titulo} ilike ${filtro}`,
    sql`${prazos.observacao} ilike ${filtro}`,
    sql`${prazos.conteudo} ilike ${filtro}`,
  );
  const itens = termo
    ? await db
        .select({
          id: prazos.id,
          area: prazos.area,
          data: prazos.data,
          titulo: prazos.titulo,
          observacao: prazos.observacao,
          conteudo: prazos.conteudo,
          defesa: prazos.defesa,
          situacao: prazos.situacao,
          processo: sql<
            string | null
          >`substring((${prazos.titulo} || ' ' || ${prazos.observacao} || ' ' || ${prazos.conteudo}) from '[0-9]{7}-[0-9]{2}\\.[0-9]{4}\\.[0-9]\\.[0-9]{2}\\.[0-9]{4}')`,
        })
        .from(prazos)
        .where(
          situacaoOk
            ? and(filtroTexto, eq(prazos.situacao, situacaoOk))
            : filtroTexto,
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
        <form method="get" className="space-y-3">
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
          {situacaoOk ? (
            <input type="hidden" name="situacao" value={situacaoOk} />
          ) : null}
          <button type="submit" className="btn btn-primario btn-pequeno">
            Pesquisar
          </button>
        </form>
      </search>
      {termo ? (
        <nav
          aria-label="Situação do prazo"
          className="mt-4 flex flex-wrap gap-2"
        >
          <Link
            href={consultaBusca(termo)}
            aria-current={!situacaoOk ? "page" : undefined}
            className="chip"
          >
            Todos os prazos
          </Link>
          <Link
            href={consultaBusca(termo, "aberto")}
            aria-current={situacaoOk === "aberto" ? "page" : undefined}
            className="chip"
          >
            Em aberto
          </Link>
          <Link
            href={consultaBusca(termo, "cumprido")}
            aria-current={situacaoOk === "cumprido" ? "page" : undefined}
            className="chip"
          >
            Cumpridos
          </Link>
        </nav>
      ) : null}
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
            <p className="vazio mt-3">
              {situacaoOk === "aberto"
                ? "Nenhum prazo em aberto com esse texto."
                : situacaoOk === "cumprido"
                  ? "Nenhum prazo cumprido com esse texto."
                  : "Nenhum prazo com esse texto."}
            </p>
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
                  <li
                    key={item.id}
                    className={`px-5 py-4 ${faixaDaArea(item.area, item.situacao, prazoEhDefesa(item.defesa, item.titulo))}`}
                  >
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
                    {item.conteudo ? (
                      <p className="mt-2 text-sm leading-snug whitespace-pre-line text-ink">
                        <span className="font-semibold">Descrição:</span>
                        <br />
                        {textoEncaixado(item.conteudo)}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-muted">
                        Sem descrição gravada. Cole o texto em Publicação ao
                        editar o prazo.
                      </p>
                    )}
                    {item.observacao ? (
                      <p className="mt-2 text-sm leading-snug whitespace-pre-line text-ink">
                        <span className="font-semibold">Observação:</span>
                        <br />
                        {textoEncaixado(item.observacao)}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/prazos/impressao?id=${item.id}`}
                        className="btn btn-pequeno"
                      >
                        Imprimir
                      </Link>
                      {item.situacao === "aberto" ? (
                        <BotaoCumprir action={cumprir}>
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="voltar" value={voltar} />
                        </BotaoCumprir>
                      ) : null}
                      {admin && item.situacao === "cumprido" ? (
                        <form action={desfazer}>
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="voltar" value={voltar} />
                          <button type="submit" className="btn btn-pequeno">
                            Desfazer
                          </button>
                        </form>
                      ) : null}
                      {admin ? (
                        <>
                          <Link
                            href={`/admin/prazos/${item.id}`}
                            className="btn btn-pequeno"
                          >
                            Editar
                          </Link>
                          <BotaoExcluir
                            action={excluirPrazo}
                            pergunta="Excluir este prazo?"
                            rotulo="Excluir"
                          >
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="voltar" value={voltar} />
                          </BotaoExcluir>
                        </>
                      ) : null}
                    </div>
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
