export function Seta({
  direcao = "esquerda",
}: {
  direcao?: "esquerda" | "direita";
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 ${direcao === "direita" ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 6 9 12l6 6" />
    </svg>
  );
}
