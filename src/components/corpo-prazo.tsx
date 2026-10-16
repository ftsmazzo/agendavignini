"use client";

import { type ReactNode, useState } from "react";

export function CorpoPrazo({
  temCorpo,
  corpo,
  acoes,
}: {
  temCorpo: boolean;
  corpo: ReactNode;
  acoes: ReactNode;
}) {
  const [aberto, setAberto] = useState(true);

  return (
    <>
      {aberto ? corpo : null}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {temCorpo ? (
          <button
            type="button"
            onClick={() => setAberto((valor) => !valor)}
            aria-expanded={aberto}
            className="btn btn-pequeno"
          >
            {aberto ? "Minimizar" : "Mostrar"}
          </button>
        ) : null}
        {acoes}
      </div>
    </>
  );
}
