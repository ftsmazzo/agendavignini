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
  vencido: "bg-late text-late-ink",
  atual: "bg-today-mark font-bold text-today-ink",
  "em-dia": "bg-ahead text-ahead-ink",
  concluido: "bg-done-mark text-done-ink",
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
    <section
      className={
        atual ? "mt-10 w-full border-4 border-pen bg-sheet p-6" : "mt-10 w-full"
      }
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <Link
          href={`/?mes=${chaveMes(anterior.ano, anterior.mes)}`}
          className="justify-self-start border border-line bg-sheet px-4 py-3 text-lg font-semibold text-ink"
        >
          Anterior
          <span className="mt-1 block text-base font-normal text-muted">
            {nomeAnterior}
          </span>
        </Link>
        <h2 className="text-center text-5xl leading-none font-bold text-ink">
          {grade.nome} {grade.ano}
          {atual ? (
            <span className="mt-3 block text-xl font-semibold text-pen">
              Mês atual
            </span>
          ) : (
            <Link
              href="/"
              className="mt-3 block text-xl font-semibold text-pen"
            >
              Mês atual
            </Link>
          )}
        </h2>
        <Link
          href={`/?mes=${chaveMes(proximo.ano, proximo.mes)}`}
          className="justify-self-end border border-line bg-sheet px-4 py-3 text-right text-lg font-semibold text-ink"
        >
          Próximo
          <span className="mt-1 block text-base font-normal text-muted">
            {nomeProximo}
          </span>
        </Link>
      </div>
      <div className="mt-8 grid grid-cols-7 gap-2">
        {SEMANA.map((coluna) => (
          <p
            key={coluna.id}
            className="pb-2 text-center text-xl font-semibold text-muted"
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
          const classe = [
            "group relative flex h-24 w-full items-center justify-center text-3xl",
            marca
              ? APARENCIA[marca]
              : celula.fimDeSemana
                ? "bg-weekend text-muted"
                : "text-ink hover:bg-pen-soft",
            hojeMarcado ? "ring-4 ring-pen ring-inset" : "",
          ].join(" ");
          if (!celula.iso || !celula.dia) {
            return <span key={celula.chave} className="block h-24" />;
          }
          return (
            <Link
              key={celula.chave}
              href={`/prazos?data=${celula.iso}`}
              aria-current={hojeMarcado ? "date" : undefined}
              aria-label={`${celula.dia} de ${grade.nome}. ${linhas.join(" ")}`}
              className={classe}
            >
              {celula.dia}
              <span
                className={`pointer-events-none absolute top-full z-30 mt-2 hidden w-64 border border-line bg-sheet p-4 text-left shadow-lg group-hover:block group-focus-visible:block ${dica}`}
              >
                <span className="block text-lg font-semibold text-ink">
                  {celula.dia} de {grade.nome}
                </span>
                {linhas.map((linha) => (
                  <span key={linha} className="mt-1 block text-base text-ink">
                    {linha}
                  </span>
                ))}
              </span>
            </Link>
          );
        })}
      </div>
      <ul className="mt-8 flex flex-wrap gap-4 text-lg">
        {LEGENDA.map((item) => (
          <li key={item.marca} className="flex items-center gap-2">
            <span className={`inline-block h-5 w-5 ${APARENCIA[item.marca]}`} />
            {item.texto}
          </li>
        ))}
      </ul>
    </section>
  );
}
