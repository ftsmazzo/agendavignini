import type { ReactNode } from "react";

export const classeCampo = "campo";

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
      <label htmlFor={id} className="rotulo-campo">
        {rotulo}
      </label>
      {children}
    </div>
  );
}
