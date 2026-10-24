"use client";

import { type ReactNode, useId, useRef } from "react";

export function BotaoCumprir({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children?: ReactNode;
  className?: string;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const titulo = useId();

  return (
    <form className={className} action={action}>
      {children}
      <button
        type="button"
        className="btn btn-sucesso btn-pequeno"
        onClick={() => dialogo.current?.showModal()}
      >
        Cumprir
      </button>
      <dialog ref={dialogo} className="confirmacao" aria-labelledby={titulo}>
        <div className="cartao p-5 shadow-alta">
          <h2 id={titulo}>Você deseja realmente cumprir este prazo?</h2>
          <div className="confirmacao-acoes mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-pequeno"
              onClick={() => dialogo.current?.close()}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-sucesso btn-pequeno">
              Cumprir
            </button>
          </div>
        </div>
      </dialog>
    </form>
  );
}
