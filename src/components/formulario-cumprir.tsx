"use client";

import { useActionState, useState } from "react";
import { cumprirVarios } from "@/app/(painel)/prazos/cumprir/actions";

type PrazoAberto = {
  id: number;
  titulo: string;
  faixa: string;
  rotulo: string;
  marca: string;
  selo: string;
  advogados: string;
};

export function FormularioCumprir({
  dia,
  origem,
  itens,
}: {
  dia: string;
  origem: "atraso" | "cumprir";
  itens: PrazoAberto[];
}) {
  const [estado, acao, pendente] = useActionState(cumprirVarios, {
    erro: "",
  });
  const [ids, setIds] = useState<number[]>([]);
  const todos = itens.length > 0 && ids.length === itens.length;

  return (
    <form action={acao} className="mt-8">
      <input type="hidden" name="dia" value={dia} />
      <input type="hidden" name="origem" value={origem} />
      {estado.erro ? (
        <p role="alert" className="mt-4 text-xl text-late">
          {estado.erro}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-3 text-xl text-ink">
          <input
            type="checkbox"
            checked={todos}
            onChange={(evento) =>
              setIds(evento.target.checked ? itens.map((item) => item.id) : [])
            }
            className="h-5 w-5"
          />
          Selecionar todos deste dia
        </label>
        <button
          type="submit"
          disabled={pendente || ids.length === 0}
          className="bg-pen px-4 py-3 text-lg font-semibold text-sheet disabled:opacity-60"
        >
          {pendente
            ? "Cumprindo."
            : `Cumprir ${ids.length === 1 ? "1 prazo" : `${ids.length} prazos`}`}
        </button>
      </div>
      <ul className="mt-4 divide-y divide-line border border-line bg-sheet">
        {itens.map((item) => {
          const ligado = ids.includes(item.id);
          return (
            <li key={item.id} className={`px-4 py-3 ${item.faixa}`}>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="prazos"
                  value={item.id}
                  checked={ligado}
                  onChange={(evento) =>
                    setIds((atual) =>
                      evento.target.checked
                        ? [...atual, item.id]
                        : atual.filter((id) => id !== item.id),
                    )
                  }
                  className="mt-1 h-5 w-5"
                />
                <span>
                  <span className="flex flex-wrap items-center gap-2 text-lg text-muted">
                    {item.rotulo}
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-base font-semibold ${item.selo}`}
                    >
                      {item.marca}
                    </span>
                  </span>
                  <span className="mt-1 block text-xl text-ink">
                    {item.titulo}
                  </span>
                  {item.advogados ? (
                    <span className="mt-1 block text-lg text-ink">
                      {item.advogados}
                    </span>
                  ) : (
                    <span className="mt-1 block text-lg text-muted">
                      Sem advogado marcado
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </form>
  );
}
