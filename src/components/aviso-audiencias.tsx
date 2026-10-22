"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function AvisoAudiencias({
  total,
  usuarioId,
}: {
  total: number;
  usuarioId: number;
}) {
  const [aberto, setAberto] = useState(false);
  const [montado, setMontado] = useState(false);
  const chave = `cv-audiencias-aviso-${usuarioId}`;

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    if (total <= 0) {
      return;
    }
    if (sessionStorage.getItem(chave) === "1") {
      return;
    }
    setAberto(true);
  }, [total, chave]);

  if (total <= 0) {
    return null;
  }

  function alternar() {
    setAberto((valor) => {
      const proximo = !valor;
      sessionStorage.setItem(chave, proximo ? "0" : "1");
      return proximo;
    });
  }

  const frase =
    total === 1
      ? "Você tem 1 audiência em aberto no seu nome."
      : `Você tem ${total} audiências em aberto no seu nome.`;

  return (
    <>
      <button
        type="button"
        className="btn btn-pequeno relative"
        aria-expanded={aberto}
        aria-controls="aviso-audiencias"
        title="Audiências pendentes"
        onClick={alternar}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        <span className="sr-only">Audiências pendentes</span>
        <span className="selo selo-audiencia">{total}</span>
      </button>
      {aberto && montado
        ? createPortal(
            <div
              id="aviso-audiencias"
              role="dialog"
              aria-labelledby="aviso-audiencias-titulo"
              className="cartao fixed top-[4.25rem] right-4 z-40 w-[min(22rem,calc(100vw-2rem))] p-4 shadow-alta md:right-8"
            >
              <h2
                id="aviso-audiencias-titulo"
                className="text-base font-semibold"
              >
                Audiências pendentes
              </h2>
              <p className="mt-2 text-sm leading-snug text-ink">{frase}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href="/audiencias?minhas=1"
                  className="btn btn-primario btn-pequeno"
                >
                  Ver as minhas
                </a>
                <button
                  type="button"
                  className="btn btn-pequeno"
                  onClick={alternar}
                >
                  Fechar
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
