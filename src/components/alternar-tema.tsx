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
      className="btn btn-pequeno btn-icone"
      title="Alternar entre modo claro e escuro"
      aria-label="Alternar entre modo claro e escuro"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 dark:hidden"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 14.5A7.5 7.5 0 0 1 9.5 4 7 7 0 1 0 20 14.5z" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="hidden h-4 w-4 dark:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      </svg>
    </button>
  );
}
