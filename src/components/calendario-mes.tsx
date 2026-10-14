import Link from "next/link";
import { chaveMes, deslocarMes, montarMes } from "@/lib/calendario";
import type { MarcaDia } from "@/lib/contagens";

const SEMANA = [
  { id: "domingo", letra: "D" },
  { id: "segunda", letra: "S" },
  { id: "terca", letra: "T" },
  { id: "quarta", letra: "Q" },
  { id: "quinta", letra: "Q" },
  { id: "sexta", letra: "S" },
  { id: "sabado", letra: "S" },
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

const ROTULO: Record<MarcaDia, string> = {
  vencido: "prazo em aberto já vencido",
  atual: "prazo de hoje em aberto",
  "em-dia": "prazo futuro em aberto",
  concluido: "prazos cumpridos",
};

export function CalendarioMes({
  ano,
  mes,
  hoje,
  marcas,
  atual = false,
}: {
  ano: number;
  mes: number;
  hoje: string;
  marcas: Record<string, MarcaDia>;
  atual?: boolean;
}) {
  const grade = montarMes(ano, mes);
  const anterior = deslocarMes(ano, mes, -1);
  const proximo = deslocarMes(ano, mes, 1);
  const nomeAnterior = montarMes(anterior.ano, anterior.mes).nome;
  const nomeProximo = montarMes(proximo.ano, proximo.mes).nome;
  const semanas: (typeof grade.dias)[] = [];
  for (let inicio = 0; inicio < grade.dias.length; inicio += 7) {
    semanas.push(grade.dias.slice(inicio, inicio + 7));
  }

  return (
    <section
      className={
        atual
          ? "mx-auto mt-10 max-w-3xl border-4 border-pen bg-sheet p-4"
          : "mx-auto mt-10 max-w-3xl"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/?mes=${chaveMes(anterior.ano, anterior.mes)}`}
          className="border border-line bg-sheet px-4 py-3 text-lg font-semibold text-ink"
        >
          Anterior
          <span className="mt-1 block text-base font-normal text-muted">
            {nomeAnterior}
          </span>
        </Link>
        <h2 className="text-center text-4xl leading-none font-bold text-ink">
          {grade.nome} {grade.ano}
          {atual ? (
            <span className="mt-2 block text-lg font-semibold text-pen">
              Mês atual
            </span>
          ) : (
            <Link
              href="/"
              className="mt-2 block text-lg font-semibold text-pen"
            >
              Mês atual
            </Link>
          )}
        </h2>
        <Link
          href={`/?mes=${chaveMes(proximo.ano, proximo.mes)}`}
          className="border border-line bg-sheet px-4 py-3 text-right text-lg font-semibold text-ink"
        >
          Próximo
          <span className="mt-1 block text-base font-normal text-muted">
            {nomeProximo}
          </span>
        </Link>
      </div>
      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr>
            {SEMANA.map((coluna) => (
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
          {semanas.map((semana) => (
            <tr key={semana.map((celula) => celula.chave).join("|")}>
              {semana.map((celula) => {
                const marca = celula.iso ? marcas[celula.iso] : undefined;
                const hojeMarcado = celula.iso === hoje;
                const classe = [
                  "flex h-16 w-full items-center justify-center text-2xl",
                  marca
                    ? APARENCIA[marca]
                    : celula.fimDeSemana
                      ? "bg-weekend text-muted"
                      : "text-ink hover:bg-pen-soft",
                  hojeMarcado ? "ring-4 ring-pen ring-inset" : "",
                ].join(" ");
                return (
                  <td key={celula.chave} className="p-1">
                    {celula.iso && celula.dia ? (
                      <Link
                        href={`/prazos?data=${celula.iso}`}
                        aria-current={hojeMarcado ? "date" : undefined}
                        aria-label={
                          marca
                            ? `${celula.dia} de ${grade.nome}, ${ROTULO[marca]}`
                            : `${celula.dia} de ${grade.nome}`
                        }
                        className={classe}
                      >
                        {celula.dia}
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
      <ul className="mt-6 flex flex-wrap gap-3 text-lg">
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
