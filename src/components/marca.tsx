import Image from "next/image";

export function Simbolo({
  className = "",
  cor = "branco",
}: {
  className?: string;
  cor?: "branco" | "verde";
}) {
  return (
    <Image
      src={`/marca/simbolo-${cor}.svg`}
      alt=""
      width={475}
      height={499}
      unoptimized
      priority
      className={className}
    />
  );
}

const TAMANHOS = {
  menu: {
    simbolo: "h-11 w-auto",
    nome: "text-[1.05rem]",
    sub: "text-[0.6rem] tracking-[0.05em]",
  },
  login: {
    simbolo: "h-44 w-auto",
    nome: "text-5xl",
    sub: "text-xl tracking-[0.03em]",
  },
} as const;

/** Símbolo desenhado mais o nome do escritório escrito em texto. */
export function Marca({
  variante = "menu",
  cor = "branco",
}: {
  variante?: keyof typeof TAMANHOS;
  cor?: "branco" | "verde";
}) {
  const medidas = TAMANHOS[variante];
  const vertical = variante === "login";

  return (
    <div
      className={
        vertical ? "flex flex-col items-start gap-6" : "flex items-center gap-3"
      }
    >
      <Simbolo cor={cor} className={medidas.simbolo} />
      <div>
        <p className={`marca-nome ${medidas.nome}`}>Coelho Vignini</p>
        <p className={`marca-nome mt-1 ${medidas.sub}`}>Advogados Associados</p>
      </div>
    </div>
  );
}
