"use client";

import type { ReactNode } from "react";

export function BotaoExcluir({
  action,
  pergunta,
  rotulo,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  pergunta: string;
  rotulo: string;
  children?: ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(evento) => {
        if (!window.confirm(pergunta)) {
          evento.preventDefault();
        }
      }}
    >
      {children}
      <button
        type="submit"
        className="border border-hearing px-4 py-3 text-xl font-semibold text-hearing"
      >
        {rotulo}
      </button>
    </form>
  );
}
