import type { ReactNode } from "react";

export function Tela({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-5xl">
      <h1 className="text-4xl leading-tight font-bold text-ink">{titulo}</h1>
      <div className="mt-6 max-w-[40rem] text-xl leading-8 text-ink">
        {children}
      </div>
    </section>
  );
}
