import Link from "next/link";
import { Suspense } from "react";
import { classeCampo } from "@/components/campo";
import { exigirUsuario } from "@/lib/acesso";
import { fimDoMes } from "@/lib/calendario";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr, dataHoraBr, dataIsoValida, semanaDe } from "@/lib/datas";
import { caixaConfigurada } from "@/lib/email";
import { listarPessoas } from "@/lib/pessoas";
import {
  faixaDaArea,
  itensDoDia,
  marcaDoPrazo,
  painelDoPeriodo,
  resumoDoDia,
  rotuloArea,
  statusDoPrazo,
  textoDoResumo,
} from "@/lib/resumo";

const TOM = {
  vermelho: "bg-late text-late-ink",
  amarelo: "bg-today-mark text-today-ink",
  verde: "bg-done-mark text-done-ink",
} as const;

const PONTO = {
  vermelho: "bg-late",
  amarelo: "bg-today-mark",
  verde: "bg-done-mark",
} as const;

function tomDoDia(data: string, abertos: number, hoje: string) {
  if (abertos === 0) {
    return "verde" as const;
  }
  return marcaDoPrazo("aberto", data, hoje).tom;
}

const BARRA = {
  administrativo: "bg-area-admin",
  civil: "bg-area-civil",
  trabalhista: "bg-area-trab",
} as const;

export default function Resumo({
  searchParams,
}: {
  searchParams: Promise<{
    quando?: string;
    inicio?: string;
    fim?: string;
    dia?: string;
    advogado?: string;
    pessoa?: string;
  }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-xl text-muted">Abrindo o resumo.</p>}
    >
      <Corpo searchParams={searchParams} />
    </Suspense>
  );
}

function periodoPedido(
  quando: string | undefined,
  inicio: string | undefined,
  fim: string | undefined,
  dia: string | undefined,
  hoje: string,
) {
  if (quando === "semana") {
    return { ...semanaDe(hoje), quando: "semana" as const };
  }
  if (quando === "mes") {
    const ano = Number(hoje.slice(0, 4));
    const mes = Number(hoje.slice(5, 7));
    return {
      inicio: `${hoje.slice(0, 7)}-01`,
      fim: fimDoMes(ano, mes),
      quando: "mes" as const,
    };
  }
  if (
    inicio &&
    fim &&
    dataIsoValida(inicio) &&
    dataIsoValida(fim) &&
    inicio <= fim &&
    quando !== "hoje"
  ) {
    return { inicio, fim, quando: "intervalo" as const };
  }
  const unico = dia && dataIsoValida(dia) ? dia : hoje;
  return {
    inicio: unico,
    fim: unico,
    quando: unico === hoje ? ("hoje" as const) : ("intervalo" as const),
  };
}

function ligaAdvogado(
  recorte: {
    quando: "hoje" | "semana" | "mes" | "intervalo";
    inicio: string;
    fim: string;
  },
  advogado: number | null,
) {
  const params = new URLSearchParams();
  if (recorte.quando === "intervalo") {
    params.set("inicio", recorte.inicio);
    params.set("fim", recorte.fim);
  } else {
    params.set("quando", recorte.quando);
  }
  if (advogado !== null) {
    params.set("advogado", String(advogado));
  }
  return `/resumo?${params}`;
}

function liga(quando: "hoje" | "semana" | "mes", advogado: number | null) {
  const params = new URLSearchParams();
  params.set("quando", quando);
  if (advogado !== null) {
    params.set("advogado", String(advogado));
  }
  return `/resumo?${params}`;
}

function ligaDia(base: {
  quando: "hoje" | "semana" | "mes" | "intervalo";
  inicio: string;
  fim: string;
  advogado: number | null;
  dia: string;
}) {
  const params = new URLSearchParams();
  if (base.quando === "intervalo") {
    params.set("inicio", base.inicio);
    params.set("fim", base.fim);
  } else {
    params.set("quando", base.quando);
  }
  if (base.advogado !== null) {
    params.set("advogado", String(base.advogado));
  }
  if (base.inicio !== base.fim) {
    params.set("dia", base.dia);
  }
  return `/resumo?${params}`;
}

function rotuloPeriodo(inicio: string, fim: string) {
  if (inicio === fim) {
    return dataBr(inicio);
  }
  return `${dataBr(inicio)} a ${dataBr(fim)}`;
}

function largura(valor: number, maior: number) {
  if (valor <= 0 || maior <= 0) {
    return "0%";
  }
  return `${Math.max(8, Math.round((valor / maior) * 100))}%`;
}

async function Corpo({
  searchParams,
}: {
  searchParams: Promise<{
    quando?: string;
    inicio?: string;
    fim?: string;
    dia?: string;
    advogado?: string;
    pessoa?: string;
  }>;
}) {
  const params = await searchParams;
  const usuario = await exigirUsuario();
  const hoje = hojeNoEscritorio();
  const admin = usuario.papel === "admin";
  const recorte = periodoPedido(
    params.quando,
    params.inicio,
    params.fim,
    params.dia,
    hoje,
  );
  const pessoas = admin
    ? (await listarPessoas()).filter((pessoa) => pessoa.ativo)
    : [];
  const pedido = params.advogado ?? params.pessoa ?? "";
  const numero = Number(pedido);
  const escolhida = pessoas.find((pessoa) => pessoa.id === numero);
  const advogado = admin
    ? pedido === "0"
      ? 0
      : (escolhida?.id ?? null)
    : usuario.id;
  const nomeAdvogado = admin
    ? advogado === null
      ? "Escritório"
      : advogado === 0
        ? "Sem advogado marcado"
        : (escolhida?.nome ?? usuario.nome)
    : usuario.nome;
  const painel = await painelDoPeriodo(
    recorte.inicio,
    recorte.fim,
    hoje,
    advogado,
  );
  const diaLista =
    recorte.inicio === recorte.fim
      ? recorte.inicio
      : params.dia &&
          dataIsoValida(params.dia) &&
          params.dia >= recorte.inicio &&
          params.dia <= recorte.fim
        ? params.dia
        : "";
  const itens = diaLista ? await itensDoDia(diaLista, advogado) : null;
  const textoEmail =
    admin && advogado && advogado > 0 && recorte.inicio === recorte.fim
      ? textoDoResumo(nomeAdvogado, await resumoDoDia(advogado, recorte.inicio))
      : "";
  const maiorArea = Math.max(...painel.areas.map((area) => area.total), 1);
  const maiorPessoa = Math.max(
    painel.semAdvogado,
    ...painel.pessoas.map((pessoa) => pessoa.total),
    1,
  );
  const cartoes = [
    {
      rotulo: "Prazos",
      valor: painel.total,
      detalhe: "no período",
      tom: "text-ink",
    },
    {
      rotulo: "Vencidos",
      valor: painel.vencidos,
      detalhe: "em aberto e já passou",
      tom: "text-late",
    },
    {
      rotulo: "Por cumprir",
      valor: painel.porCumprir,
      detalhe: "ainda no prazo",
      tom: "text-ahead",
    },
    {
      rotulo: "Cumpridos",
      valor: painel.cumpridos,
      detalhe: "no período",
      tom: "text-done",
    },
    {
      rotulo: "Audiências",
      valor: painel.audiencias,
      detalhe: "no período",
      tom: "text-hearing",
    },
  ];

  return (
    <section className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl leading-tight font-bold text-ink">Resumo</h1>
          <p className="mt-2 text-2xl text-ink">
            {rotuloPeriodo(recorte.inicio, recorte.fim)}
          </p>
          <p className="mt-1 text-xl text-muted">{nomeAdvogado}</p>
        </div>
      </div>

      <nav aria-label="Período" className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["hoje", "Hoje"],
            ["semana", "Esta semana"],
            ["mes", "Este mês"],
          ] as const
        ).map(([chave, rotulo]) => (
          <Link
            key={chave}
            href={liga(chave, advogado)}
            aria-current={recorte.quando === chave ? "page" : undefined}
            className={
              recorte.quando === chave
                ? "bg-pen px-4 py-2 text-lg font-semibold text-sheet"
                : "border border-line bg-sheet px-4 py-2 text-lg text-ink"
            }
          >
            {rotulo}
          </Link>
        ))}
      </nav>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        {admin ? (
          <div>
            <label htmlFor="advogado" className="mb-2 block text-xl text-ink">
              Advogado
            </label>
            <select
              id="advogado"
              name="advogado"
              defaultValue={advogado === null ? "" : String(advogado)}
              className={classeCampo}
            >
              <option value="">Escritório</option>
              <option value="0">Sem advogado marcado</option>
              {pessoas.map((pessoa) => (
                <option key={pessoa.id} value={pessoa.id}>
                  {pessoa.nome}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div>
          <label htmlFor="inicio" className="mb-2 block text-xl text-ink">
            De
          </label>
          <input
            id="inicio"
            name="inicio"
            type="date"
            defaultValue={recorte.inicio}
            className={classeCampo}
          />
        </div>
        <div>
          <label htmlFor="fim" className="mb-2 block text-xl text-ink">
            Até
          </label>
          <input
            id="fim"
            name="fim"
            type="date"
            defaultValue={recorte.fim}
            className={classeCampo}
          />
        </div>
        <button
          type="submit"
          className="bg-pen px-4 py-3 text-lg font-semibold text-sheet"
        >
          Ver período
        </button>
      </form>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cartoes.map((cartao) => (
          <article
            key={cartao.rotulo}
            className="border border-line bg-sheet px-5 py-5"
          >
            <p className="text-lg text-muted">{cartao.rotulo}</p>
            <p className={`mt-2 text-5xl leading-none font-bold ${cartao.tom}`}>
              {cartao.valor}
            </p>
            <p className="mt-3 text-lg text-muted">{cartao.detalhe}</p>
          </article>
        ))}
      </div>

      <ul className="mt-4 flex flex-wrap gap-3 text-lg text-ink">
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-full bg-late" />
          Vencido
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-full bg-today-mark" />
          Perto, hoje ou nos dois dias seguintes
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-full bg-done-mark" />
          Cumprido ou no prazo
        </li>
      </ul>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="border border-line bg-sheet p-5">
          <h2 className="text-2xl font-semibold text-ink">Áreas</h2>
          <ul className="mt-4 space-y-4">
            {painel.areas.map((area) => (
              <li key={area.area}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-xl text-ink">{rotuloArea(area.area)}</p>
                  <p className="text-lg text-muted">
                    {area.total} · {area.abertos} em aberto
                  </p>
                </div>
                <div className="mt-2 h-3 bg-paper">
                  <div
                    className={`h-3 ${BARRA[area.area]}`}
                    style={{ width: largura(area.total, maiorArea) }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {admin && advogado === null ? (
          <section className="border border-line bg-sheet p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-2xl font-semibold text-ink">Advogados</h2>
              <Link
                href="/admin/prazos/sem-advogado"
                className="text-lg font-semibold text-pen"
              >
                Marcar os sem advogado
              </Link>
            </div>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href={ligaAdvogado(recorte, 0)} className="block">
                  <span className="flex items-baseline justify-between gap-3 text-xl text-ink">
                    Sem advogado marcado
                    <span className="text-lg text-muted">
                      {painel.semAdvogado}
                    </span>
                  </span>
                  <span className="mt-2 block h-3 bg-paper">
                    <span
                      className="block h-3 bg-muted"
                      style={{
                        width: largura(painel.semAdvogado, maiorPessoa),
                      }}
                    />
                  </span>
                </Link>
              </li>
              {painel.pessoas.map((pessoa) => (
                <li key={pessoa.id}>
                  <Link
                    href={ligaAdvogado(recorte, pessoa.id)}
                    className="block"
                  >
                    <span className="flex items-baseline justify-between gap-3 text-xl text-ink">
                      {pessoa.nome}
                      <span className="text-lg text-muted">{pessoa.total}</span>
                    </span>
                    <span className="mt-2 block h-3 bg-paper">
                      <span
                        className="block h-3 bg-pen"
                        style={{ width: largura(pessoa.total, maiorPessoa) }}
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="border border-line bg-sheet p-5">
            <h2 className="text-2xl font-semibold text-ink">Como ler</h2>
            <p className="mt-4 text-xl text-ink">
              Vencidos são prazos em aberto com data anterior a hoje. Por
              cumprir são os que ainda estão no prazo.
            </p>
          </section>
        )}
      </div>

      {painel.dias.length > 1 ? (
        <nav aria-label="Dias do período" className="mt-8 flex flex-wrap gap-2">
          {painel.dias.map((dia) => (
            <Link
              key={dia.data}
              href={ligaDia({ ...recorte, advogado, dia: dia.data })}
              aria-current={dia.data === diaLista ? "page" : undefined}
              className={
                dia.data === diaLista
                  ? "bg-pen px-3 py-2 text-lg font-semibold text-sheet"
                  : "border border-line bg-sheet px-3 py-2 text-lg text-ink"
              }
            >
              <span className="flex items-center gap-2">
                <span
                  className={`inline-block h-3 w-3 rounded-full ${PONTO[tomDoDia(dia.data, dia.abertos, hoje)]}`}
                />
                {dataBr(dia.data)}
              </span>
              <span className="mt-1 block text-base font-normal">
                {dia.total === 1 ? "1 prazo" : `${dia.total} prazos`}
                {dia.abertos > 0 ? ` · ${dia.abertos} em aberto` : ""}
              </span>
            </Link>
          ))}
        </nav>
      ) : null}

      {itens ? (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-ink">
            {dataBr(diaLista)}
            {itens.prazos.length === 1
              ? " · 1 prazo"
              : ` · ${itens.prazos.length} prazos`}
          </h2>
          {itens.audiencias.length > 0 ? (
            <ul className="mt-4 divide-y divide-line border border-line bg-sheet">
              {itens.audiencias.map((item) => (
                <li key={item.id} className="px-5 py-4">
                  <p className="text-lg text-hearing">
                    {dataHoraBr(item.dataHora)}
                    {item.vara ? ` · ${item.vara}` : ""}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-ink">
                    {item.numeroProcesso || "Audiência sem número"}
                  </p>
                  <p className="mt-1 text-lg text-muted">
                    {[item.reclamante, item.reclamado]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
          {itens.prazos.length === 0 ? (
            <p className="mt-4 text-xl text-ink">Nenhum prazo neste dia.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line border border-line bg-sheet">
              {itens.prazos.map((item) => {
                const marca = marcaDoPrazo(item.situacao, item.data, hoje);
                return (
                  <li
                    key={item.id}
                    className={`px-5 py-4 ${faixaDaArea(item.area)}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-lg text-muted">
                        {rotuloArea(item.area)} · {statusDoPrazo(item)}
                      </p>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-base font-semibold ${TOM[marca.tom]}`}
                      >
                        {marca.texto}
                      </span>
                    </div>
                    <h3 className="mt-1 text-2xl font-semibold text-ink">
                      <Link
                        href={`/prazos?data=${item.data}`}
                        className="text-ink"
                      >
                        {item.titulo}
                      </Link>
                    </h3>
                    {item.conteudo ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-lg text-pen">
                          Ver publicação
                        </summary>
                        <p className="mt-2 text-lg whitespace-pre-wrap text-ink">
                          {item.conteudo}
                        </p>
                      </details>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <p className="mt-8 text-xl text-ink">
          Escolha um dia para ver os prazos desse recorte.
        </p>
      )}

      {textoEmail ? (
        <details className="mt-8">
          <summary className="cursor-pointer text-lg text-pen">
            Texto do e-mail deste advogado neste dia
          </summary>
          <pre className="mt-4 text-lg whitespace-pre-wrap text-ink">
            {textoEmail}
          </pre>
        </details>
      ) : null}

      <p className="mt-8 text-lg text-muted">
        {caixaConfigurada()
          ? "O e-mail da manhã continua saindo por pessoa, com o que está marcado no nome dela."
          : "A caixa de e-mail do escritório ainda não está ligada neste servidor. Enquanto isso, o resumo fica nesta tela."}
      </p>
    </section>
  );
}
