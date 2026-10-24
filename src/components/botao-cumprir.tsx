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
        <div className="cartao p-6 shadow-alta">
          <h2 id={titulo} className="titulo-secao">
            Você deseja realmente cumprir este prazo?
          </h2>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="btn"
              onClick={() => dialogo.current?.close()}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-sucesso">
              Cumprir
            </button>
          </div>
        </div>
      </dialog>
    </form>
  );
}
