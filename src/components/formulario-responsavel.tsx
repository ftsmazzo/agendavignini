"use client";

import { useActionState, useState } from "react";
import { marcarResponsaveis } from "@/app/(painel)/admin/prazos/sem-advogado/actions";
import { CaixasAdvogados } from "@/components/caixas-advogados";

type PrazoAberto = {
  id: number;
  titulo: string;
  faixa: string;
  rotulo: string;
  marca: string;
};

export function FormularioResponsavel({
  dia,
  itens,
  pessoas,
}: {
  dia: string;
  itens: PrazoAberto[];
  pessoas: Array<{ id: number; nome: string }>;
}) {
  const [estado, acao, pendente] = useActionState(marcarResponsaveis, {
    erro: "",
  });
  const [ids, setIds] = useState<number[]>([]);
  const todos = itens.length > 0 && ids.length === itens.length;

  function alternar(id: number, ligado: boolean) {
    setIds((atual) =>
      ligado ? [...atual, id] : atual.filter((item) => item !== id),
    );
  }

  return (
    <form action={acao} className="mt-8">
      <input type="hidden" name="dia" value={dia} />
      <CaixasAdvogados pessoas={pessoas} marcados={[]} />
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
            ? "Marcando."
            : `Marcar ${ids.length === 1 ? "1 prazo" : `${ids.length} prazos`}`}
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
                    alternar(item.id, evento.target.checked)
                  }
                  className="mt-1 h-5 w-5"
                />
                <span>
                  <span className="block text-lg text-muted">
                    {item.rotulo} · {item.marca}
                  </span>
                  <span className="mt-1 block text-xl text-ink">
                    {item.titulo}
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
