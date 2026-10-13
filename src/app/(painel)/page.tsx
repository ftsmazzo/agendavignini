import { connection } from "next/server";
import { Suspense } from "react";
import { CalendarioAno } from "@/components/calendario-ano";
import { isoDe } from "@/lib/calendario";

const contagens = [
  {
    href: "/prazos?quando=hoje",
    rotulo: "Prazos de hoje",
    detalhe: "cumpridos aparecem aqui",
    valor: "0",
  },
  {
    href: "/prazos?quando=semana",
    rotulo: "Prazos da semana",
    detalhe: "cumpridos aparecem aqui",
    valor: "0",
  },
  {
    href: "/audiencias",
    rotulo: "Audiências na semana",
    detalhe: "as suas aparecem aqui",
    valor: "0",
    tom: "hearing" as const,
  },
];

export default function TelaInicial() {
  return (
    <Suspense fallback={<p className="text-muted">Abrindo o dia.</p>}>
      <PainelDoDia />
    </Suspense>
  );
}

async function PainelDoDia() {
  await connection();
  const agora = new Date();
  const hoje = isoDe(agora);
  const dataLonga = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(agora);
  const dataExibida = dataLonga.charAt(0).toUpperCase() + dataLonga.slice(1);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <p className="text-2xl text-muted">{dataExibida}</p>
      <div className="mt-6 grid border border-line bg-sheet lg:grid-cols-3">
        {contagens.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="border-b border-line px-6 py-6 last:border-b-0 lg:border-r lg:border-b-0 lg:last:border-r-0"
          >
            <p className="text-xl text-muted">{item.rotulo}</p>
            <p
              className={`mt-2 text-6xl leading-none font-bold ${item.tom === "hearing" ? "text-hearing" : "text-ink"}`}
            >
              {item.valor}
            </p>
            <p className="mt-3 text-lg text-done">{item.detalhe}</p>
          </a>
        ))}
      </div>
      <p className="mt-4 text-lg text-muted">
        Os números entram quando a base do escritório estiver carregada.
      </p>
      <div className="mt-10">
        <CalendarioAno ano={agora.getFullYear()} hoje={hoje} />
      </div>
    </div>
  );
}
