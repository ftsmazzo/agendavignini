import { Suspense } from "react";
import { Tela } from "@/components/tela";

export default function Busca({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <Tela titulo="Pesquisar um prazo">
          <p>Abrindo a busca.</p>
        </Tela>
      }
    >
      <Resultado searchParams={searchParams} />
    </Suspense>
  );
}

async function Resultado({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const termo = q?.trim();

  return (
    <Tela titulo="Pesquisar um prazo">
      <p>
        {termo
          ? `A busca por “${termo}” passa a olhar título e texto da publicação quando a base estiver carregada.`
          : "Digite um processo, um cliente ou um ato na caixa do menu."}
      </p>
    </Tela>
  );
}
