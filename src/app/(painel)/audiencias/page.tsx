import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { classeCampo } from "@/components/campo";
import { exigirUsuario } from "@/lib/acesso";
import {
  listarAudiencias,
  listarAudienciasDaSemana,
  listarAudienciasDoMes,
} from "@/lib/audiencias";
import { chaveMes, deslocarMes, montarMes } from "@/lib/calendario";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr, dataHoraBr, dataIsoValida, semanaDe } from "@/lib/datas";

const DIAS = [
  { id: "domingo", letra: "Dom" },
  { id: "segunda", letra: "Seg" },
  { id: "terca", letra: "Ter" },
  { id: "quarta", letra: "Qua" },
  { id: "quinta", letra: "Qui" },
  { id: "sexta", letra: "Sex" },
  { id: "sabado", letra: "Sáb" },
];

const SETA =
  "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-sheet text-ink shadow-suave transition-colors hover:border-pen hover:bg-pen-soft";

function comSuas(href: string, suas: boolean) {
  if (!suas) {
    return href;
  }
  return href.includes("?") ? `${href}&minhas=1` : `${href}?minhas=1`;
}

function Vistas({
  semana,
  mes,
  ativo,
  suas,
}: {
  semana: string;
  mes: string;
  ativo: "semana" | "mes" | "lista" | "dia";
  suas: boolean;
}) {
  const itens = [
    {
      id: "semana" as const,
      rotulo: "Semana",
      href: comSuas(`/audiencias?semana=${semana}`, suas),
    },
    {
      id: "mes" as const,
      rotulo: "Mês",
      href: comSuas(`/audiencias?mes=${mes}`, suas),
    },
    {
      id: "lista" as const,
      rotulo: "Próximas",
      href: comSuas("/audiencias?lista=1", suas),
    },
  ];
  return (
    <nav aria-label="Forma de ver" className="flex flex-wrap gap-2">
      {itens.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          aria-current={item.id === ativo ? "page" : undefined}
          className="chip"
        >
          {item.rotulo}
        </Link>
      ))}
    </nav>
  );
}

function Recorte({ base, suas }: { base: string; suas: boolean }) {
  return (
    <nav aria-label="De quem" className="flex flex-wrap gap-2">
      <Link
        href={base}
        aria-current={suas ? undefined : "page"}
        className="chip"
      >
        Todas
      </Link>
      <Link
        href={comSuas(base, true)}
        aria-current={suas ? "page" : undefined}
        className="chip"
      >
        Suas
      </Link>
    </nav>
  );
}

function rotuloDia(iso: string) {
  const semana = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${iso}T12:00:00-03:00`));
  return `${semana} ${dataBr(iso).slice(0, 5)}`;
}

function SetaEsquerda() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function SetaDireita() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export default function Audiencias({
  searchParams,
}: {
  searchParams: Promise<{
    data?: string;
    semana?: string;
    lista?: string;
    mes?: string;
    minhas?: string;
  }>;
}) {
  return (
    <Suspense fallback={<p className="text-muted">Abrindo as audiências.</p>}>
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

async function Lista({
  searchParams,
}: {
  searchParams: Promise<{
    data?: string;
    semana?: string;
    lista?: string;
    mes?: string;
    minhas?: string;
  }>;
}) {
  const { data, semana, lista, mes, minhas } = await searchParams;
  const suas = minhas === "1";
  await connection();
  const usuario = await exigirUsuario();
  const dia = data && dataIsoValida(data) ? data : null;
  const hoje = hojeNoEscritorio();
  if (!dia && lista !== "1" && mes && /^\d{4}-\d{2}$/.test(mes)) {
    const ano = Number(mes.slice(0, 4));
    const numero = Number(mes.slice(5, 7));
    if (numero >= 1 && numero <= 12 && ano >= 1900 && ano <= 2100) {
      const grade = montarMes(ano, numero);
      const anterior = deslocarMes(ano, numero, -1);
      const proximo = deslocarMes(ano, numero, 1);
      const carregadas = await listarAudienciasDoMes(ano, numero, usuario.id);
      const itens = suas ? carregadas.filter((item) => item.minha) : carregadas;
      const porDia = new Map<string, typeof itens>();
      for (const item of itens) {
        const listaDia = porDia.get(item.dia) ?? [];
        listaDia.push(item);
        porDia.set(item.dia, listaDia);
      }
      const semanasGrade: (typeof grade.dias)[] = [];
      for (let inicio = 0; inicio < grade.dias.length; inicio += 7) {
        semanasGrade.push(grade.dias.slice(inicio, inicio + 7));
      }
      const diasComAudiencia = [...porDia.keys()].sort();
      const nomeAnterior = montarMes(anterior.ano, anterior.mes).nome;
      const nomeProximo = montarMes(proximo.ano, proximo.mes).nome;
      return (
        <section className="entrada mx-auto w-full max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="titulo-pagina capitalize">
              {grade.nome}{" "}
              <span className="font-medium text-muted">{grade.ano}</span>
            </h1>
            <div className="flex items-center gap-2">
              <Link
                href={comSuas(
                  `/audiencias?mes=${chaveMes(anterior.ano, anterior.mes)}`,
                  suas,
                )}
                className={SETA}
                aria-label={`Mês anterior: ${nomeAnterior}`}
                title={nomeAnterior}
              >
                <SetaEsquerda />
              </Link>
              <Link
                href={comSuas(
                  `/audiencias?mes=${chaveMes(proximo.ano, proximo.mes)}`,
                  suas,
                )}
                className={SETA}
                aria-label={`Próximo mês: ${nomeProximo}`}
                title={nomeProximo}
              >
                <SetaDireita />
              </Link>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Vistas
              ativo="mes"
              mes={chaveMes(ano, numero)}
              semana={`${chaveMes(ano, numero)}-01`}
              suas={suas}
            />
            <Recorte
              base={`/audiencias?mes=${chaveMes(ano, numero)}`}
              suas={suas}
            />
            <Link
              href={`/audiencias/impressao?data=${chaveMes(ano, numero)}-01`}
              className="btn-texto"
            >
              Imprimir a semana
            </Link>
          </div>
          <div className="cartao mt-6 p-3 md:p-5">
            <table className="w-full border-separate border-spacing-1">
              <thead>
                <tr>
                  {DIAS.map((coluna) => (
                    <th
                      key={coluna.id}
                      className="pb-2 text-center text-sm font-semibold text-muted"
                    >
                      {coluna.letra}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {semanasGrade.map((linha) => (
                  <tr key={linha.map((celula) => celula.chave).join("|")}>
                    {linha.map((celula) => {
                      const total = celula.iso
                        ? (porDia.get(celula.iso)?.length ?? 0)
                        : 0;
                      const hojeMarcado = celula.iso === hoje;
                      const classe = [
                        "flex h-14 w-full flex-col items-center justify-center rounded-xl text-lg transition-colors md:h-16",
                        total > 0
                          ? "bg-hearing-soft font-bold text-hearing ring-1 ring-hearing/40"
                          : celula.fimDeSemana
                            ? "bg-weekend text-muted"
                            : "text-ink hover:bg-pen-soft",
                        hojeMarcado ? "ring-2 ring-pen ring-inset" : "",
                      ].join(" ");
                      return (
                        <td key={celula.chave} className="p-0">
                          {celula.iso && celula.dia ? (
                            <Link
                              href={comSuas(
                                `/audiencias?data=${celula.iso}`,
                                suas,
                              )}
                              aria-current={hojeMarcado ? "date" : undefined}
                              aria-label={
                                total > 1
                                  ? `${celula.dia} de ${grade.nome}, ${total} audiências`
                                  : total === 1
                                    ? `${celula.dia} de ${grade.nome}, 1 audiência`
                                    : `${celula.dia} de ${grade.nome}`
                              }
                              className={classe}
                            >
                              {celula.dia}
                              {total > 0 ? (
                                <span className="text-sm leading-none">
                                  {total}
                                </span>
                              ) : null}
                            </Link>
                          ) : (
                            <span className="block h-14 md:h-16" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-muted">
            {itens.length === 1
              ? "1 audiência neste mês."
              : `${itens.length} audiências neste mês.`}
          </p>
          {diasComAudiencia.map((coluna) => (
            <section key={coluna} className="mt-6">
              <h2 className="titulo-secao capitalize">
                <Link
                  href={comSuas(`/audiencias?data=${coluna}`, suas)}
                  className="text-pen hover:underline"
                >
                  {rotuloDia(coluna)}
                </Link>
              </h2>
              <ul className="lista-cartoes mt-3">
                {(porDia.get(coluna) ?? []).map((item) => (
                  <li key={item.id} className="px-5 py-4">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="selo selo-audiencia">{item.hora}</span>
                      {item.minha ? <span className="selo">Sua</span> : null}
                    </p>
                    <p className="mt-2 text-lg font-bold text-ink">
                      {item.numeroProcesso || "Sem número"}
                    </p>
                    <p className="mt-1 text-ink">
                      {[item.reclamante, item.reclamado]
                        .filter(Boolean)
                        .join(" × ")}
                    </p>
                    <p className="mt-1 text-muted">
                      {[item.vara, item.local].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </section>
      );
    }
  }
  if (!dia && lista !== "1") {
    const ancora = semana && dataIsoValida(semana) ? semana : hoje;
    const quadroCheio = await listarAudienciasDaSemana(ancora, usuario.id);
    const quadro = suas
      ? {
          ...quadroCheio,
          itens: quadroCheio.itens.filter((item) => item.minha),
        }
      : quadroCheio;
    const estaSemana = semanaDe(hoje).inicio === quadro.inicio;
    return (
      <section className="entrada mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="titulo-pagina">
              Semana de {dataBr(quadro.inicio)} a {dataBr(quadro.sexta)}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={comSuas(`/audiencias?semana=${quadro.anterior}`, suas)}
              className="btn"
            >
              ← Semana anterior
            </Link>
            <Link
              href={comSuas(`/audiencias?semana=${quadro.proxima}`, suas)}
              className="btn"
            >
              Próxima semana →
            </Link>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Vistas
            ativo="semana"
            semana={quadro.inicio}
            mes={quadro.inicio.slice(0, 7)}
            suas={suas}
          />
          <Recorte
            base={
              estaSemana ? "/audiencias" : `/audiencias?semana=${quadro.inicio}`
            }
            suas={suas}
          />
          {estaSemana ? null : (
            <Link href={comSuas("/audiencias", suas)} className="btn-texto">
              Esta semana
            </Link>
          )}
          <Link
            href={`/audiencias/impressao?data=${quadro.inicio}`}
            className="btn-texto"
          >
            Imprimir a semana
          </Link>
          {usuario.papel === "admin" ? (
            <Link href="/admin/audiencias/nova" className="btn-texto">
              Adicionar nova
            </Link>
          ) : null}
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-5">
          {quadro.dias.map((coluna) => {
            const doDia = quadro.itens.filter((item) => item.dia === coluna);
            return (
              <section
                key={coluna}
                className={`cartao p-3 ${coluna === hoje ? "ring-2 ring-pen" : ""}`}
              >
                <h2 className="flex items-center justify-between gap-2 text-base font-bold capitalize">
                  <Link
                    href={comSuas(`/audiencias?data=${coluna}`, suas)}
                    className="text-pen hover:underline"
                  >
                    {rotuloDia(coluna)}
                  </Link>
                  <span className="selo selo-neutro">{doDia.length}</span>
                </h2>
                {doDia.length === 0 ? (
                  <p className="mt-4 text-muted">Nenhuma</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {doDia.map((item) => (
                      <li
                        key={item.id}
                        className={`rounded-xl border p-3 ${
                          item.minha
                            ? "border-hearing bg-hearing-soft"
                            : "border-line bg-paper"
                        }`}
                      >
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="selo selo-audiencia">
                            {item.hora}
                          </span>
                          {item.minha ? (
                            <span className="selo">Sua</span>
                          ) : null}
                        </p>
                        <p className="mt-2 font-bold text-ink">
                          {item.numeroProcesso || "Sem número"}
                        </p>
                        <p className="mt-1 text-[0.9688rem] text-ink">
                          {[item.reclamante, item.reclamado]
                            .filter(Boolean)
                            .join(" × ")}
                        </p>
                        <p className="mt-1 text-[0.9688rem] text-muted">
                          {[item.vara, item.local].filter(Boolean).join(" · ")}
                        </p>
                        {item.preposto ? (
                          <p className="mt-1 text-[0.9688rem] text-muted">
                            Preposto: {item.preposto}
                          </p>
                        ) : null}
                        {item.advogados.length > 0 ? (
                          <p className="mt-1 text-[0.9688rem] text-muted">
                            {item.advogados.join(", ")}
                          </p>
                        ) : null}
                        {item.observacao ? (
                          <p className="mt-2 text-[0.9688rem] whitespace-pre-wrap text-ink">
                            {item.observacao}
                          </p>
                        ) : null}
                        {usuario.papel === "admin" ? (
                          <Link
                            href={`/admin/audiencias/${item.id}`}
                            className="btn btn-pequeno mt-3"
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
  const carregadas = await listarAudiencias(dia, usuario.id);
  const itens = suas ? carregadas.filter((item) => item.minha) : carregadas;

  return (
    <section className="entrada mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="titulo-pagina">Audiências</h1>
        {usuario.papel === "admin" ? (
          <Link href="/admin/audiencias/nova" className="btn btn-primario">
            + Adicionar nova
          </Link>
        ) : null}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Vistas
          ativo={dia ? "dia" : "lista"}
          semana={dia ?? hoje}
          mes={(dia ?? hoje).slice(0, 7)}
          suas={suas}
        />
        <Recorte
          base={dia ? `/audiencias?data=${dia}` : "/audiencias?lista=1"}
          suas={suas}
        />
      </div>
      <form
        method="get"
        className="cartao mt-6 flex flex-wrap items-end gap-3 p-4 md:p-5"
      >
        <div>
          <label htmlFor="data" className="rotulo-campo">
            Ver um dia
          </label>
          <input
            id="data"
            name="data"
            type="date"
            defaultValue={dia ?? ""}
            className={classeCampo}
          />
          {suas ? <input type="hidden" name="minhas" value="1" /> : null}
        </div>
        <button type="submit" className="btn btn-primario">
          Ver
        </button>
        <Link
          href={comSuas(
            dia ? `/audiencias?semana=${dia}` : "/audiencias",
            suas,
          )}
          className="btn-texto px-2 py-3"
        >
          Ver a semana
        </Link>
        {dia ? (
          <Link
            href={comSuas("/audiencias?lista=1", suas)}
            className="btn-texto px-2 py-3"
          >
            Próximas
          </Link>
        ) : null}
        <Link
          href={`/audiencias/impressao?data=${dia ?? hojeNoEscritorio()}`}
          className="btn-texto px-2 py-3"
        >
          Imprimir a semana
        </Link>
      </form>
      <p className="mt-4 text-muted">
        {dia
          ? `${itens.length} neste dia.`
          : itens.length === 150
            ? "Mostrando as 150 próximas."
            : `${itens.length} a partir de hoje.`}
      </p>
      {itens.length === 0 ? (
        <p className="vazio mt-6">Nenhuma audiência neste recorte.</p>
      ) : (
        <ul className="lista-cartoes mt-4">
          {itens.map((item) => (
            <li key={item.id} className="px-5 py-4">
              <p className="flex flex-wrap items-center gap-2">
                <span className="selo selo-audiencia">
                  {dataHoraBr(item.dataHora)}
                </span>
                {item.minha ? <span className="selo">Sua</span> : null}
              </p>
              <h2 className="mt-2 text-lg font-bold text-ink">
                {item.numeroProcesso || "Sem número"}
              </h2>
              <p className="mt-1 text-ink">
                {[item.vara, item.local].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-1 text-ink">
                {[item.reclamante, item.reclamado].filter(Boolean).join(" × ")}
              </p>
              {item.preposto ? (
                <p className="mt-1 text-muted">Preposto: {item.preposto}</p>
              ) : null}
              {item.advogados.length > 0 ? (
                <p className="mt-1 text-muted">{item.advogados.join(", ")}</p>
              ) : null}
              {item.observacao ? (
                <p className="mt-3 whitespace-pre-wrap text-ink">
                  {item.observacao}
                </p>
              ) : null}
              {usuario.papel === "admin" ? (
                <Link
                  href={`/admin/audiencias/${item.id}`}
                  className="btn btn-pequeno mt-3"
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
