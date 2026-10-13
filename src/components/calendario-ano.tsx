import Link from "next/link";
import { montarAno } from "@/lib/calendario";

const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

export function CalendarioAno({ ano, hoje }: { ano: number; hoje: string }) {
  const meses = montarAno(ano);

  return (
    <div>
      <h2 className="text-5xl leading-none font-bold text-ink">{ano}</h2>
      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
        {meses.map((mes) => (
          <section key={mes.nome} className="border border-line bg-sheet p-5">
            <h3 className="text-2xl font-bold text-ink">{mes.nome}</h3>
            <table className="mt-4 w-full border-collapse text-lg">
              <thead>
                <tr>
                  {SEMANA.map((letra, indice) => (
                    <th
                      key={`${mes.nome}-${letra}-${indice}`}
                      className="pb-2 text-center font-semibold text-muted"
                    >
                      {letra}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: mes.dias.length / 7 }, (_, semana) => (
                  <tr key={`${mes.nome}-s${semana}`}>
                    {mes.dias
                      .slice(semana * 7, semana * 7 + 7)
                      .map((celula, indice) => {
                        const hojeMarcado = celula.iso === hoje;
                        return (
                          <td
                            key={`${mes.nome}-${semana}-${indice}`}
                            className="p-1 text-center"
                          >
                            {celula.iso && celula.dia ? (
                              <Link
                                href={`/prazos?data=${celula.iso}`}
                                aria-current={hojeMarcado ? "date" : undefined}
                                className={
                                  hojeMarcado
                                    ? "inline-flex h-12 w-12 items-center justify-center bg-pen text-xl font-bold text-sheet"
                                    : "inline-flex h-12 w-12 items-center justify-center text-xl text-ink hover:bg-pen-soft"
                                }
                              >
                                {celula.dia}
                              </Link>
                            ) : (
                              <span className="inline-flex h-12 w-12" />
                            )}
                          </td>
                        );
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
}
