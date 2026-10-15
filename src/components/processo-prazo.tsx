import Link from "next/link";

export function ProcessoPrazo({ numero }: { numero: string | null }) {
  if (!numero) {
    return null;
  }
  return (
    <p className="mt-1">
      <Link
        href={`/busca?q=${encodeURIComponent(numero)}`}
        className="text-base font-semibold tracking-tight text-pen"
      >
        {numero}
      </Link>
    </p>
  );
}
