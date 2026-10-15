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
      className="btn btn-pequeno"
      title="Alternar entre modo claro e escuro"
    >
      <span className="dark:hidden">🌙 Modo escuro</span>
      <span className="hidden dark:inline">☀️ Modo claro</span>
    </button>
  );
}
