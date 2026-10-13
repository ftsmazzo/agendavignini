"use client";

export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="nao-imprimir bg-pen px-4 py-3 text-lg font-semibold text-sheet"
    >
      Imprimir
    </button>
  );
}
