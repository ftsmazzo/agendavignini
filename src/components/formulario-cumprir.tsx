"use client";

import Link from "next/link";
import { useActionState, useId, useRef, useState } from "react";
import { cumprirVarios } from "@/app/(painel)/prazos/cumprir/actions";

type PrazoAberto = {
  id: number;
  titulo: string;
  faixa: string;
  rotulo: string;
  marca: string;
  selo: string;
  advogados: string;
  processo: string;
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
  const dialogo = useRef<HTMLDialogElement>(null);
  const titulo = useId();
  const todos = itens.length > 0 && ids.length === itens.length;
  const frase =
    ids.length === 1
      ? "Você deseja realmente cumprir este prazo?"
      : "Você deseja realmente cumprir estes prazos?";

  return (
    <form action={acao} className="mt-6">
      <input type="hidden" name="dia" value={dia} />
      <input type="hidden" name="origem" value={origem} />
      {estado.erro ? (
        <p role="alert" className="aviso aviso-erro mb-4">
          {estado.erro}
        </p>
      ) : null}
      <div className="cartao flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold text-ink">
          <input
            type="checkbox"
            checked={todos}
            onChange={(evento) =>
              setIds(evento.target.checked ? itens.map((item) => item.id) : [])
            }
            className="h-5 w-5 accent-pen"
          />
          Selecionar todos deste dia
        </label>
        <button
          type="button"
          disabled={pendente || ids.length === 0}
          className="btn btn-sucesso disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => dialogo.current?.showModal()}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m4 10.5 4 4 8-9" />
          </svg>
          {pendente
            ? "Cumprindo."
            : `Cumprir ${ids.length === 1 ? "1 prazo" : `${ids.length} prazos`}`}
        </button>
      </div>
      <ul className="lista-cartoes mt-4">
        {itens.map((item) => {
          const ligado = ids.includes(item.id);
          return (
            <li
              key={item.id}
              className={`${item.faixa}${ligado ? " prazo-selecionado" : ""}`}
            >
              <label className="flex cursor-pointer items-start gap-4 px-5 py-4">
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
                  className="mt-1 h-5 w-5 shrink-0 accent-pen"
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="selo">{item.rotulo}</span>
                    <span
                      className={`inline-flex rounded-full px-3 py-0.5 text-[0.8125rem] font-semibold ${item.selo}`}
                    >
                      {item.marca}
                    </span>
                  </span>
                  <span className="mt-1 block text-lg font-semibold text-ink">
                    {item.titulo}
                  </span>
                  {item.advogados ? (
                    <span className="mt-1 block text-base text-ink">
                      {item.advogados}
                    </span>
                  ) : (
                    <span className="mt-1 block text-base text-muted">
                      Sem advogado marcado
                    </span>
                  )}
                </span>
              </label>
              {item.processo ? (
                <p className="px-5 pb-4">
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
      <dialog ref={dialogo} className="confirmacao" aria-labelledby={titulo}>
        <div className="cartao p-6 shadow-alta">
          <h2 id={titulo} className="titulo-secao">
            {frase}
          </h2>
          <p className="mt-2 text-base text-muted">
            {ids.length === 1
              ? "1 prazo em aberto."
              : `${ids.length} prazos em aberto.`}
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="btn"
              onClick={() => dialogo.current?.close()}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-sucesso"
              disabled={pendente}
            >
              {pendente ? "Cumprindo." : "Cumprir"}
            </button>
          </div>
        </div>
      </dialog>
    </form>
  );
}
