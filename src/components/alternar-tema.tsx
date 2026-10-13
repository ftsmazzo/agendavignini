"use client";

export function AlternarTema() {
  function alternar() {
    const raiz = document.documentElement;
    const escuro = raiz.classList.toggle("dark");
    localStorage.setItem("tema", escuro ? "escuro" : "claro");
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className="border border-line bg-sheet px-4 py-3 text-lg text-ink"
    >
      <span className="dark:hidden">Usar modo escuro</span>
      <span className="hidden dark:inline">Usar modo claro</span>
    </button>
  );
}
