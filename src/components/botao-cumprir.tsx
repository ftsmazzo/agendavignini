"use client";

import type { ReactNode } from "react";

export function BotaoCumprir({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <form
      className={className}
      action={action}
      onSubmit={(evento) => {
        if (!window.confirm("Você deseja realmente cumprir este prazo?")) {
          evento.preventDefault();
        }
      }}
    >
      {children}
      <button type="submit" className="btn btn-sucesso btn-pequeno">
        Cumprir
      </button>
    </form>
  );
}
