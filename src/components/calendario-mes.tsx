import Link from "next/link";
import { chaveMes, deslocarMes, montarMes } from "@/lib/calendario";
import type { MarcaDia, ResumoDia } from "@/lib/contagens";

const SEMANA = [
  { id: "domingo", letra: "Dom" },
  { id: "segunda", letra: "Seg" },
  { id: "terca", letra: "Ter" },
  { id: "quarta", letra: "Qua" },
  { id: "quinta", letra: "Qui" },
  { id: "sexta", letra: "Sex" },
  { id: "sabado", letra: "Sáb" },
];

const APARENCIA: Record<MarcaDia, string> = {
  vencido: "bg-late-soft text-late ring-1 ring-late/40 font-bold",
  atual: "bg-today-mark text-today-ink font-bold shadow-suave",
  "em-dia": "bg-pen-soft text-pen ring-1 ring-pen/30 font-semibold",
  concluido: "bg-done-soft text-done ring-1 ring-done/30 font-semibold",
};

const PONTO: Record<MarcaDia, string> = {
  vencido: "bg-late",
  atual: "bg-today-mark",
  "em-dia": "bg-pen",
  concluido: "bg-done",
};

const LEGENDA: Array<{ marca: MarcaDia; texto: string }> = [
  { marca: "vencido", texto: "Aberto e já passou" },
  { marca: "atual", texto: "Aberto hoje" },
  { marca: "em-dia", texto: "Aberto à frente" },
  { marca: "concluido", texto: "Tudo cumprido" },
];

const AREAS: Array<{
  chave: "administrativo" | "civil" | "trabalhista";
  texto: string;
}> = [
  { chave: "administrativo", texto: "Administrativo" },
  { chave: "civil", texto: "Cível" },
  { chave: "trabalhista", texto: "Trabalhista" },
];

function marcaDe(resumo: ResumoDia | undefined, iso: string, hoje: string) {
  if (!resumo || resumo.abertos + resumo.cumpridos === 0) {
    return undefined;
  }
  if (resumo.abertos > 0) {
    if (iso < hoje) {
      return "vencido" as const;
    }
    if (iso === hoje) {
      return "atual" as const;
    }
    return "em-dia" as const;
  }
  return "concluido" as const;
}

function frase(quantidade: number, um: string, varios: string) {
  return quantidade === 1 ? `1 ${um}` : `${quantidade} ${varios}`;
}

function linhasDoDia(resumo: ResumoDia | undefined) {
  const abertos = resumo?.abertos ?? 0;
  const cumpridos = resumo?.cumpridos ?? 0;
  const total = abertos + cumpridos;
  const audiencias = resumo?.audiencias ?? 0;
  const linhas: string[] = [];
  if (total === 0) {
    linhas.push("Nenhum prazo neste dia.");
  } else {
    linhas.push(frase(total, "prazo", "prazos"));
    if (abertos > 0) {
      linhas.push(frase(abertos, "em aberto", "em aberto"));
    }
    if (cumpridos > 0) {
      linhas.push(frase(cumpridos, "cumprido", "cumpridos"));
    }
    if (resumo) {
      for (const area of AREAS) {
        if (resumo[area.chave] > 0) {
          linhas.push(`${area.texto} · ${resumo[area.chave]}`);
        }
      }
    }
  }
  if (audiencias > 0) {
    linhas.push(frase(audiencias, "audiência", "audiências"));
  }
  return linhas;
}

const SETA =
  "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-sheet text-ink shadow-suave transition-colors hover:border-pen hover:bg-pen-soft";

export function CalendarioMes({
  ano,
  mes,
  hoje,
  resumos,
  atual = false,
}: {
  ano: number;
  mes: number;
  hoje: string;
  resumos: Record<string, ResumoDia>;
  atual?: boolean;
}) {
  const grade = montarMes(ano, mes);
  const anterior = deslocarMes(ano, mes, -1);
  const proximo = deslocarMes(ano, mes, 1);
  const nomeAnterior = montarMes(anterior.ano, anterior.mes).nome;
  const nomeProximo = montarMes(proximo.ano, proximo.mes).nome;

  return (
    <section className="cartao mt-8 w-full p-5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl leading-none font-bold tracking-tight text-ink capitalize md:text-4xl">
            {grade.nome}{" "}
            <span className="font-medium text-muted">{grade.ano}</span>
          </h2>
          {atual ? (
            <span className="selo mt-3">Mês atual</span>
          ) : (
            <Link href="/" className="btn-texto mt-3 text-[0.9688rem]">
              ↩ Voltar ao mês atual
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/?mes=${chaveMes(anterior.ano, anterior.mes)}`}
            className={SETA}
            aria-label={`Mês anterior: ${nomeAnterior}`}
            title={nomeAnterior}
          >
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
          </Link>
          <Link
            href={`/?mes=${chaveMes(proximo.ano, proximo.mes)}`}
            className={SETA}
            aria-label={`Próximo mês: ${nomeProximo}`}
            title={nomeProximo}
          >
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
          </Link>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-7 gap-1.5 md:gap-2">
        {SEMANA.map((coluna) => (
          <p
            key={coluna.id}
            className="pb-1 text-center text-xs font-bold tracking-[0.1em] text-muted uppercase md:text-sm"
          >
            {coluna.letra}
          </p>
        ))}
        {grade.dias.map((celula, indice) => {
          const resumo = celula.iso ? resumos[celula.iso] : undefined;
          const marca = celula.iso
            ? marcaDe(resumo, celula.iso, hoje)
            : undefined;
          const hojeMarcado = celula.iso === hoje;
          const linhas = linhasDoDia(resumo);
          const coluna = indice % 7;
          const dica =
            coluna === 0
              ? "left-0"
              : coluna === 6
                ? "right-0"
                : "left-1/2 -translate-x-1/2";
          const total = (resumo?.abertos ?? 0) + (resumo?.cumpridos ?? 0);
          const audiencias = resumo?.audiencias ?? 0;
          const classe = [
            "group relative flex h-16 w-full flex-col items-center justify-center gap-1 rounded-xl text-lg transition-all hover:-translate-y-0.5 hover:shadow-media md:h-24 md:text-2xl",
            marca
              ? APARENCIA[marca]
              : celula.fimDeSemana
                ? "bg-weekend text-muted hover:bg-pen-soft"
                : "bg-paper text-ink hover:bg-pen-soft",
            hojeMarcado ? "outline-3 outline-offset-2 outline-pen" : "",
          ].join(" ");
          if (!celula.iso || !celula.dia) {
            return <span key={celula.chave} className="block h-16 md:h-24" />;
          }
          return (
            <Link
              key={celula.chave}
              href={`/prazos?data=${celula.iso}`}
              aria-current={hojeMarcado ? "date" : undefined}
              aria-label={`${celula.dia} de ${grade.nome}. ${linhas.join(" ")}`}
              className={classe}
            >
              <span className="leading-none">{celula.dia}</span>
              {total > 0 || audiencias > 0 ? (
                <span className="flex items-center gap-1 text-[0.6875rem] leading-none font-semibold md:text-xs">
                  {total > 0 ? (
                    <span className="rounded-full bg-sheet/70 px-1.5 py-0.5">
                      {total}
                    </span>
                  ) : null}
                  {audiencias > 0 ? (
                    <span
                      className="h-2 w-2 rounded-full bg-hearing"
                      title="Tem audiência"
                    />
                  ) : null}
                </span>
              ) : null}
              <span
                className={`pointer-events-none absolute top-full z-30 mt-2 hidden w-60 rounded-xl border border-line bg-sheet p-4 text-left font-normal shadow-alta group-hover:block group-focus-visible:block ${dica}`}
              >
                <span className="block text-base font-bold text-ink">
                  {celula.dia} de {grade.nome}
                </span>
                {linhas.map((linha) => (
                  <span
                    key={linha}
                    className="mt-1 block text-[0.9375rem] text-muted"
                  >
                    {linha}
                  </span>
                ))}
              </span>
            </Link>
          );
        })}
      </div>
      <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-5 text-[0.9375rem] text-muted">
        {LEGENDA.map((item) => (
          <li key={item.marca} className="flex items-center gap-2">
            <span
              className={`inline-block h-3 w-3 rounded-full ${PONTO[item.marca]}`}
            />
            {item.texto}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-hearing" />
          Dia com audiência
        </li>
      </ul>
    </section>
  );
}
