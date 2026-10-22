import { connection } from "next/server";
import { Suspense } from "react";
import { CalendarioAno } from "@/components/calendario-ano";
import { CalendarioMes } from "@/components/calendario-mes";
import { chaveMes, lerMes } from "@/lib/calendario";
import {
  contarPainel,
  hojeNoEscritorio,
  marcasDoAno,
  resumosDoMes,
} from "@/lib/contagens";
import { lerSessao } from "@/lib/sessao";

export default function TelaInicial({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; vista?: string }>;
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
  searchParams: Promise<{ mes?: string; vista?: string }>;
}) {
  await connection();
  const { mes, vista } = await searchParams;
  const anual = vista !== "mes";
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
        atraso: 0,
        meusAbertos: 0,
      };
  const resumos = anual ? {} : await resumosDoMes(recorte.ano, recorte.mes);
  const marcas = anual ? await marcasDoAno(recorte.ano, hoje) : {};
  const hrefMes = `/?vista=mes&mes=${chaveMes(recorte.ano, recorte.mes)}`;
  const hrefAno = `/?mes=${chaveMes(recorte.ano, 1)}`;
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
    {
      href: "/prazos/atraso",
      rotulo: "Em atraso",
      valor: contas.atraso,
      detalhe: "em aberto e já passou",
      tom: "late" as const,
    },
  ];

  return (
    <div className={`mx-auto w-full ${anual ? "max-w-7xl" : "max-w-6xl"}`}>
      <p className="text-sm font-semibold tracking-[0.08em] text-muted uppercase">
        {dataExibida}
      </p>
      <h1 className="titulo-pagina mt-1">Seu dia no escritório</h1>
      <p className="mt-4 flex flex-wrap gap-3">
        <a href="/resumo" className="btn btn-primario">
          Seu resumo de hoje
        </a>
        <a href="/prazos/meus" className="btn">
          Seus prazos em aberto
          <span className="selo">{contas.meusAbertos}</span>
        </a>
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cartoes.map((item) => (
          <a key={item.href} href={item.href} className="cartao-link p-6">
            <p className="text-[0.9688rem] font-medium text-muted">
              {item.rotulo}
            </p>
            <p
              className={`mt-2 text-5xl leading-none font-bold tracking-tight ${
                item.tom === "hearing"
                  ? "text-hearing"
                  : item.tom === "late"
                    ? "text-late"
                    : "text-ink"
              }`}
            >
              {item.valor}
            </p>
            <p className="mt-4">
              <span
                className={`selo ${item.tom === "late" ? "selo-atraso" : item.tom === "hearing" ? "selo-audiencia" : "selo-ok"}`}
              >
                {item.detalhe}
              </span>
            </p>
          </a>
        ))}
      </div>
      <nav aria-label="Vista da agenda" className="mt-8 flex flex-wrap gap-2">
        <a
          href={hrefMes}
          aria-current={anual ? undefined : "page"}
          className="chip"
        >
          Mensal
        </a>
        <a
          href={hrefAno}
          aria-current={anual ? "page" : undefined}
          className="chip"
        >
          Anual
        </a>
        {anual ? (
          <>
            <a href={`/?mes=${recorte.ano - 1}-01`} className="btn">
              ← {recorte.ano - 1}
            </a>
            <a href={`/?mes=${recorte.ano + 1}-01`} className="btn">
              {recorte.ano + 1} →
            </a>
          </>
        ) : null}
      </nav>
      {anual ? (
        <CalendarioAno ano={recorte.ano} hoje={hoje} marcas={marcas} />
      ) : (
        <CalendarioMes
          ano={recorte.ano}
          mes={recorte.mes}
          hoje={hoje}
          resumos={resumos}
          atual={mesAtual}
        />
      )}
    </div>
  );
}
