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
      <div className="mt-4 flex flex-wrap gap-3">
        {temCorpo ? (
          <button
            type="button"
            onClick={() => setAberto((valor) => !valor)}
            className="border border-line bg-sheet px-4 py-2 text-lg font-semibold text-ink"
          >
            {aberto ? "Minimizar" : "Mostrar"}
          </button>
        ) : null}
        {acoes}
      </div>
    </>
  );
}
