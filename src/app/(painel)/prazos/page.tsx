import { Suspense } from "react";
import { Tela } from "@/components/tela";

export default function Prazos({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; quando?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <Tela titulo="Prazos">
          <p>Abrindo os prazos.</p>
        </Tela>
      }
    >
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

async function Lista({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; quando?: string }>;
}) {
  const { data, quando } = await searchParams;
  const recorte =
    quando === "hoje"
      ? "de hoje"
      : quando === "semana"
        ? "da semana"
        : data
          ? `de ${data.split("-").reverse().join("/")}`
          : "do período escolhido";

  return (
    <Tela titulo={`Prazos ${recorte}`}>
      <p>
        Esta é a lista que abre ao clicar no dia ou nos contadores. Cada prazo
        mostra a área, o ato e se já foi cumprido.
      </p>
    </Tela>
  );
}
