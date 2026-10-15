"use client";

import { useActionState, useState } from "react";
import { adiarPrazos } from "@/app/(painel)/admin/prazos/adiar/actions";

type PrazoAberto = {
  id: number;
  titulo: string;
  faixa: string;
  rotulo: string;
  processo: string;
  advogados: string;
};

export function FormularioAdiar({
  dia,
  destino,
  itens,
}: {
  dia: string;
  destino: string;
  itens: PrazoAberto[];
}) {
  const [estado, acao, pendente] = useActionState(adiarPrazos, { erro: "" });
  const [ids, setIds] = useState<number[]>([]);
  const todos = itens.length > 0 && ids.length === itens.length;

  return (
    <form action={acao} className="mt-6">
      <input type="hidden" name="dia" value={dia} />
      {estado.erro ? (
        <p role="alert" className="aviso aviso-erro mb-4">
          {estado.erro}
        </p>
      ) : null}
      <div className="cartao flex flex-wrap items-end justify-between gap-3 px-5 py-4">
        <div>
          <label htmlFor="destino" className="mb-2 block text-lg text-ink">
            Nova data
          </label>
          <input
            id="destino"
            name="destino"
            type="date"
            defaultValue={destino}
            className="campo"
          />
        </div>
        <label className="flex items-center gap-3 text-lg text-ink">
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
          className="btn btn-primario disabled:opacity-60"
        >
          {pendente
            ? "Adiando."
            : `Adiar ${ids.length === 1 ? "1 prazo" : `${ids.length} prazos`}`}
        </button>
      </div>
      <ul className="lista-cartoes mt-4">
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
                  <span className="block text-base text-muted">
                    {item.rotulo}
                  </span>
                  <span className="mt-1 block text-lg text-ink">
                    {item.titulo}
                  </span>
                  {item.processo ? (
                    <span className="mt-1 block text-base font-semibold text-pen">
                      {item.processo}
                    </span>
                  ) : null}
                  <span className="mt-1 block text-base text-muted">
                    {item.advogados || "Sem advogado marcado"}
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
