import type { ReactNode } from "react";

export const classeCampo =
  "w-full border border-line bg-paper px-4 py-3 text-xl text-ink";

export function Campo({
  id,
  rotulo,
  children,
}: {
  id: string;
  rotulo: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xl text-ink">
        {rotulo}
      </label>
      {children}
    </div>
  );
}
