import Link from "next/link";

export function ProcessoPrazo({ numero }: { numero: string | null }) {
  if (!numero) {
    return null;
  }
  return (
    <p className="mt-0.5">
      <Link
        href={`/processo?n=${encodeURIComponent(numero)}`}
        className="text-sm leading-tight font-semibold tracking-tight text-pen"
      >
        {numero}
      </Link>
    </p>
  );
}
