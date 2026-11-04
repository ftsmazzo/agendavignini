"use client";

import { useEffect } from "react";

/** Rola até o cartão do prazo e mantém o foco visual após abrir pelo aviso. */
export function FocoPrazo({ id }: { id: number | null }) {
  useEffect(() => {
    if (!id) {
      return;
    }
    const cartao = document.getElementById(`prazo-${id}`);
    cartao?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [id]);
  return null;
}
