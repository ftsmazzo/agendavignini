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
  { id: "domingo", letra: "D" },
  { id: "segunda", letra: "S" },
  { id: "terca", letra: "T" },
  { id: "quarta", letra: "Q" },
  { id: "quinta", letra: "Q" },
  { id: "sexta", letra: "S" },
  { id: "sabado", letra: "S" },
];

function Vistas({
  semana,
  mes,
  ativo,
}: {
  semana: string;
  mes: string;
  ativo: "semana" | "mes" | "lista" | "dia";
}) {
  const itens = [
    {
      id: "semana" as const,
      rotulo: "Semana",
      href: `/audiencias?semana=${semana}`,
    },
    { id: "mes" as const, rotulo: "Mês", href: `/audiencias?mes=${mes}` },
    { id: "lista" as const, rotulo: "Próximas", href: "/audiencias?lista=1" },
  ];
  return (
    <nav aria-label="Forma de ver" className="flex flex-wrap gap-2">
      {itens.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          aria-current={item.id === ativo ? "page" : undefined}
          className={
            item.id === ativo
              ? "bg-pen px-3 py-2 text-lg font-semibold text-sheet"
              : "border border-line bg-sheet px-3 py-2 text-lg text-ink"
          }
        >
          {item.rotulo}
        </Link>
      ))}
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

export default function Audiencias({
  searchParams,
}: {
  searchParams: Promise<{
    data?: string;
    semana?: string;
    lista?: string;
    mes?: string;
  }>;
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
  searchParams: Promise<{
    data?: string;
    semana?: string;
    lista?: string;
    mes?: string;
  }>;
}) {
  const { data, semana, lista, mes } = await searchParams;
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
      const itens = await listarAudienciasDoMes(ano, numero, usuario.id);
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
      return (
        <section className="mx-auto w-full max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href={`/audiencias?mes=${chaveMes(anterior.ano, anterior.mes)}`}
              className="border border-line bg-sheet px-4 py-3 text-lg font-semibold text-ink"
            >
              {montarMes(anterior.ano, anterior.mes).nome}
            </Link>
            <h1 className="text-center text-4xl leading-tight font-bold text-ink">
              {grade.nome} {grade.ano}
            </h1>
            <Link
              href={`/audiencias?mes=${chaveMes(proximo.ano, proximo.mes)}`}
              className="border border-line bg-sheet px-4 py-3 text-lg font-semibold text-ink"
            >
              {montarMes(proximo.ano, proximo.mes).nome}
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Vistas
              ativo="mes"
              mes={chaveMes(ano, numero)}
              semana={`${chaveMes(ano, numero)}-01`}
            />
            <Link
              href={`/audiencias/impressao?data=${chaveMes(ano, numero)}-01`}
              className="text-lg text-pen underline"
            >
              Imprimir a semana
            </Link>
          </div>
          <table className="mt-6 w-full border-collapse">
            <thead>
              <tr>
                {DIAS.map((coluna) => (
                  <th
                    key={coluna.id}
                    className="pb-3 text-center text-lg font-semibold text-muted"
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
                      "flex h-16 w-full flex-col items-center justify-center text-2xl",
                      total > 0
                        ? "bg-hearing font-bold text-sheet"
                        : celula.fimDeSemana
                          ? "bg-weekend text-muted"
                          : "text-ink hover:bg-pen-soft",
                      hojeMarcado ? "ring-4 ring-pen ring-inset" : "",
                    ].join(" ");
                    return (
                      <td key={celula.chave} className="p-1">
                        {celula.iso && celula.dia ? (
                          <Link
                            href={`/audiencias?data=${celula.iso}`}
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
                              <span className="text-lg leading-none">
                                {total}
                              </span>
                            ) : null}
                          </Link>
                        ) : (
                          <span className="block h-16" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-6 text-xl text-muted">
            {itens.length === 1
              ? "1 audiência neste mês."
              : `${itens.length} audiências neste mês.`}
          </p>
          {diasComAudiencia.map((coluna) => (
            <section key={coluna} className="mt-8">
              <h2 className="text-2xl font-bold text-ink">
                <Link href={`/audiencias?data=${coluna}`} className="text-pen">
                  {rotuloDia(coluna)}
                </Link>
              </h2>
              <ul className="mt-3 divide-y divide-line border border-line bg-sheet">
                {(porDia.get(coluna) ?? []).map((item) => (
                  <li key={item.id} className="px-6 py-4">
                    <p className="text-lg font-bold text-hearing">
                      {item.hora}
                      {item.minha ? " · Sua" : ""}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-ink">
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
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Vistas
            ativo="semana"
            semana={quadro.inicio}
            mes={quadro.inicio.slice(0, 7)}
          />
          {estaSemana ? null : (
            <Link href="/audiencias" className="text-lg text-pen underline">
              Esta semana
            </Link>
          )}
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
        </div>
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
      <div className="mt-6">
        <Vistas
          ativo={dia ? "dia" : "lista"}
          semana={dia ?? hoje}
          mes={(dia ?? hoje).slice(0, 7)}
        />
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
