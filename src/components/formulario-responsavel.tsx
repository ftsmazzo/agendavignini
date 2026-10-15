"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { marcarResponsaveis } from "@/app/(painel)/admin/prazos/sem-advogado/actions";
import { CaixasAdvogados } from "@/components/caixas-advogados";

type PrazoAberto = {
  id: number;
  titulo: string;
  faixa: string;
  rotulo: string;
  marca: string;
  processo: string;
};

export function FormularioResponsavel({
  dia,
  itens,
  pessoas,
  advogadosIniciais,
  seguir,
  fila,
}: {
  dia: string;
  itens: PrazoAberto[];
  pessoas: Array<{ id: number; nome: string }>;
  advogadosIniciais: number[];
  seguir: boolean;
  fila?: "atraso";
}) {
  const [estado, acao, pendente] = useActionState(marcarResponsaveis, {
    erro: "",
  });
  const [ids, setIds] = useState<number[]>(() =>
    seguir ? itens.map((item) => item.id) : [],
  );
  const todos = itens.length > 0 && ids.length === itens.length;

  function alternar(id: number, ligado: boolean) {
    setIds((atual) =>
      ligado ? [...atual, id] : atual.filter((item) => item !== id),
    );
  }

  return (
    <form action={acao} className="mt-8">
      <input type="hidden" name="dia" value={dia} />
      {fila ? <input type="hidden" name="fila" value={fila} /> : null}
      <CaixasAdvogados
        pessoas={pessoas}
        marcados={advogadosIniciais.map(String)}
      />
      {seguir ? (
        <p className="aviso mt-4">
          Os mesmos advogados continuam marcados, e os prazos deste dia também.
        </p>
      ) : null}
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
          className="btn btn-primario disabled:opacity-60"
        >
          {pendente
            ? "Marcando."
            : `Marcar ${ids.length === 1 ? "1 prazo" : `${ids.length} prazos`}`}
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
                    alternar(item.id, evento.target.checked)
                  }
                  className="mt-1 h-5 w-5 accent-[var(--pen)]"
                />
                <span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="selo">{item.rotulo}</span>
                    <span className="selo selo-neutro">{item.marca}</span>
                  </span>
                  <span className="mt-1 block font-semibold text-ink">
                    {item.titulo}
                  </span>
                </span>
              </label>
              {item.processo ? (
                <p className="px-4 pb-3">
                  <Link
                    href={`/processo?n=${encodeURIComponent(item.processo)}`}
                    className="text-base font-semibold tracking-tight text-pen"
                  >
                    {item.processo}
                  </Link>
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </form>
  );
}
