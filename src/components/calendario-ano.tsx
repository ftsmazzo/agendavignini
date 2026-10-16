import Link from "next/link";
import { chaveMes, montarMes } from "@/lib/calendario";
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
  vencido: "bg-late-soft text-late ring-1 ring-late/40 font-bold",
  atual: "bg-today-mark text-today-ink font-bold shadow-suave",
  "em-dia": "bg-pen-soft text-pen ring-1 ring-pen/30 font-semibold",
  concluido: "bg-done-soft text-done ring-1 ring-done/30 font-semibold",
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

export function CalendarioAno({
  ano,
  hoje,
  marcas,
}: {
  ano: number;
  hoje: string;
  marcas: Record<string, MarcaDia>;
}) {
  const meses = Array.from({ length: 12 }, (_, indice) =>
    montarMes(ano, indice + 1),
  );

  return (
    <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {meses.map((grade) => {
        const semanas: (typeof grade.dias)[] = [];
        for (let inicio = 0; inicio < grade.dias.length; inicio += 7) {
          semanas.push(grade.dias.slice(inicio, inicio + 7));
        }
        const mesAtual =
          grade.ano === Number(hoje.slice(0, 4)) &&
          grade.mes === Number(hoje.slice(5, 7));
        return (
          <section
            key={grade.mes}
            className={`cartao p-4 ${mesAtual ? "ring-2 ring-pen" : ""}`}
          >
            <h2 className="flex items-center justify-between gap-2 text-lg font-bold capitalize">
              <Link
                href={`/?vista=mes&mes=${chaveMes(grade.ano, grade.mes)}`}
                className="text-pen hover:underline"
              >
                {grade.nome}
              </Link>
              {mesAtual ? <span className="selo">Mês atual</span> : null}
            </h2>
            <table className="mt-3 w-full border-separate border-spacing-1">
              <thead>
                <tr>
                  {SEMANA.map((coluna) => (
                    <th
                      key={coluna.id}
                      className="pb-1 text-center text-sm font-semibold text-muted"
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
                        "flex h-9 w-full items-center justify-center rounded-lg text-base transition-colors",
                        marca
                          ? APARENCIA[marca]
                          : celula.fimDeSemana
                            ? "bg-weekend text-muted"
                            : "text-ink hover:bg-pen-soft",
                        hojeMarcado ? "ring-2 ring-pen ring-inset" : "",
                      ].join(" ");
                      return (
                        <td key={celula.chave} className="p-0">
                          {celula.iso && celula.dia ? (
                            <Link
                              href={`/prazos?data=${celula.iso}`}
                              aria-current={hojeMarcado ? "date" : undefined}
                              aria-label={
                                marca
                                  ? `${celula.dia} de ${grade.nome}, ${ROTULO[marca]}`
                                  : `${celula.dia} de ${grade.nome}`
                              }
                              title={
                                marca
                                  ? `${celula.dia} de ${grade.nome}: ${ROTULO[marca]}`
                                  : undefined
                              }
                              className={classe}
                            >
                              {celula.dia}
                            </Link>
                          ) : (
                            <span className="block h-9" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
      <ul className="cartao flex flex-wrap gap-x-6 gap-y-2 p-4 text-[0.9688rem] md:col-span-2 xl:col-span-3">
        {LEGENDA.map((item) => (
          <li key={item.marca} className="flex items-center gap-2">
            <span
              className={`inline-block h-5 w-5 rounded-md ${APARENCIA[item.marca]}`}
            />
            {item.texto}
          </li>
        ))}
      </ul>
    </div>
  );
}
