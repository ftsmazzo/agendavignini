import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ProcessoPrazo } from "@/components/processo-prazo";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr } from "@/lib/datas";
import {
  abertosDoAdvogado,
  leituraDaCarga,
  painelAdvogados,
  periodoDoMonitor,
} from "@/lib/monitor";
import { marcaDoPrazo, rotuloArea } from "@/lib/resumo";

const TOM = {
  vermelho: "bg-late text-late-ink",
  amarelo: "bg-today-mark text-today-ink",
  verde: "bg-done-mark text-done-ink",
} as const;

const LEITURA = {
  Prioridade: "selo selo-atraso",
  "Vence agora": "selo",
  "Livre agora": "selo selo-ok",
  "No prazo": "selo selo-neutro",
} as const;

function consulta(base: {
  quando: "semana" | "mes" | "intervalo";
  inicio: string;
  fim: string;
  pessoa?: number;
}) {
  const params = new URLSearchParams();
  if (base.quando === "intervalo") {
    params.set("inicio", base.inicio);
    params.set("fim", base.fim);
  } else {
    params.set("quando", base.quando);
  }
  if (base.pessoa) {
    params.set("pessoa", String(base.pessoa));
  }
  return `/admin/relatorios?${params}`;
}

function abertosDe(pessoa: {
  atraso: number;
  hoje: number;
  perto: number;
  frente: number;
}) {
  return pessoa.atraso + pessoa.hoje + pessoa.perto + pessoa.frente;
}

export default function Relatorios({
  searchParams,
}: {
  searchParams: Promise<{
    quando?: string;
    inicio?: string;
    fim?: string;
    pessoa?: string;
  }>;
}) {
  return (
    <Suspense fallback={<p className="text-muted">Abrindo o relatório.</p>}>
      <Painel searchParams={searchParams} />
    </Suspense>
  );
}

async function Painel({
  searchParams,
}: {
  searchParams: Promise<{
    quando?: string;
    inicio?: string;
    fim?: string;
    pessoa?: string;
  }>;
}) {
  await connection();
  const { quando, inicio, fim, pessoa } = await searchParams;
  const hoje = hojeNoEscritorio();
  const periodo = periodoDoMonitor(quando, inicio, fim, hoje);
  const painel = await painelAdvogados(
    hoje,
    periodo.inicio,
    periodo.fim,
    periodo.quando,
  );
  const pessoaId = Number(pessoa);
  const escolhido = painel.pessoas.find((item) => item.id === pessoaId);
  const fila = escolhido ? await abertosDoAdvogado(escolhido.id) : null;
  const maior = Math.max(1, ...painel.pessoas.map(abertosDe));
  const cartoes = [
    {
      rotulo: "Em atraso",
      valor: painel.atraso,
      detalhe: "em aberto e a data já passou",
      tom: "text-late",
      href: "/prazos/atraso",
    },
    {
      rotulo: "Vence hoje",
      valor: painel.venceHoje,
      detalhe: "ainda em aberto",
      tom: "text-ink",
      href: "/prazos?quando=hoje",
    },
    {
      rotulo: "Sem dono em atraso",
      valor: painel.semDonoAtraso,
      detalhe: "vencido e sem advogado",
      tom: "text-late",
      href: "/admin/prazos/sem-advogado?fila=atraso",
    },
    {
      rotulo: "Sem dono à frente",
      valor: painel.semDonoFrente,
      detalhe: "de hoje em diante, para distribuir",
      tom: "text-ink",
      href: "/admin/prazos/sem-advogado",
    },
    {
      rotulo: "Cumpridos no período",
      valor: painel.cumpridos,
      detalhe: `${dataBr(painel.inicio)} a ${dataBr(painel.fim)}`,
      tom: "text-ink",
      href: "",
    },
  ];

  return (
    <section className="entrada mx-auto w-full max-w-6xl">
      <h1 className="titulo-pagina">Relatórios</h1>
      <p className="subtitulo-pagina">
        Quem está com prazo vencido, quem vence agora e quem cumpriu no período.
        A carga é de hoje. Os cumpridos seguem o período escolhido.
      </p>
      <nav
        aria-label="Período dos cumpridos"
        className="mt-6 flex flex-wrap gap-2"
      >
        <Link
          href={consulta({ ...periodo, quando: "semana" })}
          aria-current={painel.quando === "semana" ? "page" : undefined}
          className="chip"
        >
          Esta semana
        </Link>
        <Link
          href={consulta({ ...periodo, quando: "mes" })}
          aria-current={painel.quando === "mes" ? "page" : undefined}
          className="chip"
        >
          Este mês
        </Link>
      </nav>
      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        {escolhido ? (
          <input type="hidden" name="pessoa" value={escolhido.id} />
        ) : null}
        <div>
          <label htmlFor="inicio" className="mb-2 block text-lg text-ink">
            Cumpridos de
          </label>
          <input
            id="inicio"
            name="inicio"
            type="date"
            defaultValue={painel.inicio}
            className="campo"
          />
        </div>
        <div>
          <label htmlFor="fim" className="mb-2 block text-lg text-ink">
            até
          </label>
          <input
            id="fim"
            name="fim"
            type="date"
            defaultValue={painel.fim}
            className="campo"
          />
        </div>
        <button type="submit" className="btn btn-primario">
          Ver período
        </button>
        <Link
          href={`/admin/relatorios/impressao?inicio=${painel.inicio}&fim=${painel.fim}${escolhido ? `&pessoa=${escolhido.id}` : ""}`}
          className="btn btn-pequeno"
        >
          Imprimir
        </Link>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cartoes.map((cartao) => {
          const corpo = (
            <>
              <p className="text-[0.9688rem] font-medium text-muted">
                {cartao.rotulo}
              </p>
              <p
                className={`mt-2 text-4xl leading-none font-bold tracking-tight ${cartao.tom}`}
              >
                {cartao.valor}
              </p>
              <p className="mt-3 text-sm text-muted">{cartao.detalhe}</p>
            </>
          );
          if (!cartao.href) {
            return (
              <article key={cartao.rotulo} className="cartao p-5">
                {corpo}
              </article>
            );
          }
          return (
            <Link
              key={cartao.rotulo}
              href={cartao.href}
              className="cartao-link p-5"
            >
              {corpo}
            </Link>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.9375rem] text-muted">
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-full bg-late" />
          Em atraso
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-full bg-today-mark" />
          Hoje ou nos dois dias seguintes
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-full bg-pen" />
          Mais à frente
        </li>
      </ul>

      <h2 className="titulo-secao mt-8">Advogados</h2>
      <p className="mt-2 text-base text-muted">
        Quem aparece primeiro tem mais prazo vencido. Livre agora pode receber
        os prazos sem dono.
      </p>
      {painel.pessoas.length === 0 ? (
        <p className="vazio mt-6">Nenhum advogado ativo neste relatório.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {painel.pessoas.map((item) => {
            const abertos = abertosDe(item);
            const leitura = leituraDaCarga(item);
            const ativo = escolhido?.id === item.id;
            return (
              <li key={item.id}>
                <Link
                  href={consulta({ ...periodo, pessoa: item.id })}
                  aria-current={ativo ? "page" : undefined}
                  className={`cartao-link block p-4 ${ativo ? "ring-2 ring-pen" : ""}`}
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="text-xl font-semibold text-ink">
                      {item.nome}
                    </span>
                    <span className={LEITURA[leitura]}>{leitura}</span>
                  </span>
                  {abertos > 0 ? (
                    <span
                      className="mt-3 block h-3 overflow-hidden rounded-full bg-paper"
                      style={{
                        width: `${Math.max(8, Math.round((abertos / maior) * 100))}%`,
                      }}
                    >
                      <span className="flex h-3">
                        <span
                          className="h-3 bg-late"
                          style={{ flex: item.atraso }}
                        />
                        <span
                          className="h-3 bg-today-mark"
                          style={{ flex: item.hoje + item.perto }}
                        />
                        <span
                          className="h-3 bg-pen"
                          style={{ flex: item.frente }}
                        />
                      </span>
                    </span>
                  ) : (
                    <span className="mt-3 block text-base text-muted">
                      Sem carga agora
                    </span>
                  )}
                  <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-base text-ink">
                    <span>{item.atraso} em atraso</span>
                    <span>{item.hoje} hoje</span>
                    <span>{item.perto} perto</span>
                    <span>{item.frente} à frente</span>
                    <span>{item.cumpridos} cumpridos no período</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {escolhido && fila ? (
        <div className="mt-10">
          <h2 className="titulo-secao">
            {escolhido.nome}
            {fila.total === 1 ? " · 1 em aberto" : ` · ${fila.total} em aberto`}
          </h2>
          <p className="mt-2 text-base text-muted">
            Os mais antigos aparecem primeiro.
            {escolhido.cumpridos === 1
              ? " Cumpriu 1 prazo neste período."
              : ` Cumpriu ${escolhido.cumpridos} prazos neste período.`}
          </p>
          {fila.itens.length === 0 ? (
            <p className="vazio mt-4">Nada em aberto no nome deste advogado.</p>
          ) : (
            <ul className="lista-cartoes mt-4">
              {fila.itens.map((item) => {
                const marca = marcaDoPrazo("aberto", item.data, hoje);
                return (
                  <li key={item.id} className="px-5 py-4">
                    <p className="flex flex-wrap items-center gap-2 text-[0.9375rem] text-muted">
                      <span className="selo">{rotuloArea(item.area)}</span>
                      <Link
                        href={`/prazos?data=${item.data}`}
                        className="btn-texto"
                      >
                        {dataBr(item.data)}
                      </Link>
                      <span
                        className={`inline-flex rounded-full px-3 py-0.5 text-[0.8125rem] font-semibold ${TOM[marca.tom]}`}
                      >
                        {marca.texto}
                      </span>
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-ink">
                      {item.titulo}
                    </h3>
                    <ProcessoPrazo numero={item.processo} />
                  </li>
                );
              })}
            </ul>
          )}
          {fila.total > fila.itens.length ? (
            <p className="mt-3 text-base text-muted">
              E mais {fila.total - fila.itens.length} em aberto.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
