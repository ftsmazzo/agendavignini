"use client";

import { useActionState, useState } from "react";
import { tirarResponsaveis } from "@/app/(painel)/admin/prazos/tirar-advogado/actions";

type PrazoVinculado = {
  id: number;
  titulo: string;
  faixa: string;
  rotulo: string;
  advogados: string;
};

export function FormularioRetirar({
  dia,
  itens,
}: {
  dia: string;
  itens: PrazoVinculado[];
}) {
  const [estado, acao, pendente] = useActionState(tirarResponsaveis, {
    erro: "",
  });
  const [ids, setIds] = useState<number[]>([]);
  const todos = itens.length > 0 && ids.length === itens.length;

  return (
    <form action={acao} className="mt-8">
      <input type="hidden" name="dia" value={dia} />
      {estado.erro ? (
        <p role="alert" className="aviso aviso-erro mt-4">
          {estado.erro}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-3 font-medium text-ink">
          <input
            type="checkbox"
            checked={todos}
            onChange={(evento) =>
              setIds(evento.target.checked ? itens.map((item) => item.id) : [])
            }
            className="h-5 w-5 accent-[var(--pen)]"
          />
          Selecionar todos deste dia
        </label>
        <button
          type="submit"
          disabled={pendente || ids.length === 0}
          className="btn btn-perigo disabled:opacity-60"
        >
          {pendente
            ? "Tirando."
            : `Tirar ${ids.length === 1 ? "1 prazo" : `${ids.length} prazos`}`}
        </button>
      </div>
      <ul className="lista-cartoes mt-4">
        {itens.map((item) => {
          const ligado = ids.includes(item.id);
          return (
            <li key={item.id} className={item.faixa}>
              <label className="flex cursor-pointer items-start gap-3 px-4 py-3">
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
                  className="mt-1 h-5 w-5 accent-[var(--pen)]"
                />
                <span>
                  <span className="selo">{item.rotulo}</span>
                  <span className="mt-1 block font-semibold text-ink">
                    {item.titulo}
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {item.advogados}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </form>
  );
}
