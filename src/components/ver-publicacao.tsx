"use client";

import { useId, useRef } from "react";
import { textoPrazo } from "@/lib/texto-prazo";

export function VerPublicacao({
  texto,
  rotulo = "Ver publicação",
}: {
  texto: string;
  rotulo?: string;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const titulo = useId();
  const limpo = textoPrazo(texto);
  if (!limpo) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-pequeno"
        onClick={() => dialogo.current?.showModal()}
      >
        {rotulo}
      </button>
      <dialog ref={dialogo} className="confirmacao" aria-labelledby={titulo}>
        <div className="cartao max-h-[min(85vh,52rem)] w-[min(92vw,48rem)] overflow-y-auto p-5 shadow-alta">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 id={titulo} className="text-lg font-semibold text-ink">
              Publicação / Descrição
            </h2>
            <button
              type="button"
              className="btn btn-pequeno"
              onClick={() => dialogo.current?.close()}
            >
              Fechar
            </button>
          </div>
          <p className="mt-4 text-sm leading-relaxed break-words whitespace-pre-wrap text-ink">
            {limpo}
          </p>
        </div>
      </dialog>
    </>
  );
}
