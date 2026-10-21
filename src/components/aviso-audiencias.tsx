"use client";

import { useEffect, useState } from "react";

export function AvisoAudiencias({
  total,
  usuarioId,
}: {
  total: number;
  usuarioId: number;
}) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (total <= 0) {
      return;
    }
    const chave = `cv-audiencias-aviso-${usuarioId}`;
    if (sessionStorage.getItem(chave) === "1") {
      return;
    }
    setAberto(true);
  }, [total, usuarioId]);

  function fechar() {
    sessionStorage.setItem(`cv-audiencias-aviso-${usuarioId}`, "1");
    setAberto(false);
  }

  if (!aberto) {
    return null;
  }

  const frase =
    total === 1
      ? "Você tem 1 audiência em aberto no seu nome."
      : `Você tem ${total} audiências em aberto no seu nome.`;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="aviso-audiencias-titulo"
        className="cartao w-full max-w-md p-6"
      >
        <h2 id="aviso-audiencias-titulo" className="titulo-secao">
          Audiências pendentes
        </h2>
        <p className="mt-3 text-lg text-ink">{frase}</p>
        <p className="mt-2 text-base text-muted">
          Conta as que ainda vão acontecer e estão ligadas a você.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="/audiencias?minhas=1" className="btn btn-primario">
            Ver as minhas
          </a>
          <button type="button" className="btn" onClick={fechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
