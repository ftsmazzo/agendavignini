import { connection } from "next/server";
import { Suspense } from "react";
import { CalendarioMes } from "@/components/calendario-mes";
import { lerMes } from "@/lib/calendario";
import { contarPainel, hojeNoEscritorio, resumosDoMes } from "@/lib/contagens";
import { lerSessao } from "@/lib/sessao";

export default function TelaInicial({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-xl text-muted">Abrindo o dia.</p>}>
      <PainelDoDia searchParams={searchParams} />
    </Suspense>
  );
}

async function PainelDoDia({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await connection();
  const { mes } = await searchParams;
  const sessao = await lerSessao();
  const agora = new Date();
  const hoje = hojeNoEscritorio(agora);
  const anoHoje = Number(hoje.slice(0, 4));
  const mesHoje = Number(hoje.slice(5, 7));
  const recorte = lerMes(mes, hoje);
  const mesAtual = recorte.ano === anoHoje && recorte.mes === mesHoje;
  const contas = sessao
    ? await contarPainel(hoje, sessao.id)
    : {
        hoje: { total: 0, cumpridos: 0 },
        semana: { total: 0, cumpridos: 0 },
        audiencias: 0,
        minhasAudiencias: 0,
      };
  const resumos = await resumosDoMes(recorte.ano, recorte.mes);
  const dataLonga = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(agora);
  const dataExibida = dataLonga.charAt(0).toUpperCase() + dataLonga.slice(1);
  const cartoes = [
    {
      href: "/prazos?quando=hoje",
      rotulo: "Prazos de hoje",
      valor: contas.hoje.total,
      detalhe: `${contas.hoje.cumpridos} cumpridos`,
    },
    {
      href: "/prazos?quando=semana",
      rotulo: "Prazos da semana",
      valor: contas.semana.total,
      detalhe: `${contas.semana.cumpridos} cumpridos`,
    },
    {
      href: "/audiencias",
      rotulo: "Audiências na semana",
      valor: contas.audiencias,
      detalhe: `${contas.minhasAudiencias} suas`,
      tom: "hearing" as const,
    },
  ];

  return (
    <div className="w-full">
      <p className="text-2xl text-muted">{dataExibida}</p>
      <p className="mt-2 text-xl">
        <a href="/resumo" className="text-pen">
          Seu resumo de hoje
        </a>
      </p>
      <div className="mt-6 grid border border-line bg-sheet lg:grid-cols-3">
        {cartoes.map((item) => (
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
      <CalendarioMes
        ano={recorte.ano}
        mes={recorte.mes}
        hoje={hoje}
        resumos={resumos}
        atual={mesAtual}
      />
    </div>
  );
}
