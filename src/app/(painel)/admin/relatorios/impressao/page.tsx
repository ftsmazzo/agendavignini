import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BotaoImprimir } from "@/components/botao-imprimir";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr, dataIsoValida } from "@/lib/datas";
import {
  abertosDoAdvogado,
  leituraDaCarga,
  painelAdvogados,
  periodoDoMonitor,
} from "@/lib/monitor";
import { rotuloArea } from "@/lib/resumo";

export default function ImpressaoRelatorio({
  searchParams,
}: {
  searchParams: Promise<{
    inicio?: string;
    fim?: string;
    pessoa?: string;
  }>;
}) {
  return (
    <Suspense fallback={<p className="text-xl text-muted">Abrindo a folha.</p>}>
      <Folha searchParams={searchParams} />
    </Suspense>
  );
}

async function Folha({
  searchParams,
}: {
  searchParams: Promise<{
    inicio?: string;
    fim?: string;
    pessoa?: string;
  }>;
}) {
  await connection();
  const { inicio, fim, pessoa } = await searchParams;
  const hoje = hojeNoEscritorio();
  const periodo = periodoDoMonitor(undefined, inicio, fim, hoje);
  const painel = await painelAdvogados(
    hoje,
    periodo.inicio,
    periodo.fim,
    periodo.quando,
  );
  const pessoaId = Number(pessoa);
  const escolhido = painel.pessoas.find((item) => item.id === pessoaId);
  const fila =
    escolhido && dataIsoValida(periodo.inicio)
      ? await abertosDoAdvogado(escolhido.id, 40)
      : null;

  return (
    <section className="mx-auto w-full max-w-4xl">
      <div className="nao-imprimir flex flex-wrap items-center gap-3">
        <BotaoImprimir />
        <Link
          href={`/admin/relatorios?inicio=${painel.inicio}&fim=${painel.fim}${escolhido ? `&pessoa=${escolhido.id}` : ""}`}
          className="text-lg text-pen"
        >
          Voltar
        </Link>
      </div>
      <h1 className="mt-6 text-4xl leading-tight font-bold text-ink">
        Carga dos advogados em {dataBr(hoje)}
      </h1>
      <p className="mt-2 text-xl text-ink">
        Cumpridos de {dataBr(painel.inicio)} a {dataBr(painel.fim)}.
      </p>
      <p className="mt-4 text-lg text-ink">
        {painel.atraso} em atraso · {painel.venceHoje} vencem hoje ·{" "}
        {painel.perto} perto · {painel.semDonoAtraso} vencidos sem dono ·{" "}
        {painel.semDonoFrente} à frente sem dono · {painel.cumpridos} cumpridos
        no período
      </p>
      <table className="mt-8 w-full border-collapse text-left text-lg text-ink">
        <thead>
          <tr className="border-b border-line">
            <th className="py-2 pr-3 font-semibold">Advogado</th>
            <th className="py-2 pr-3 font-semibold">Leitura</th>
            <th className="py-2 pr-3 font-semibold">Atraso</th>
            <th className="py-2 pr-3 font-semibold">Hoje</th>
            <th className="py-2 pr-3 font-semibold">Perto</th>
            <th className="py-2 pr-3 font-semibold">À frente</th>
            <th className="py-2 font-semibold">Cumpridos</th>
          </tr>
        </thead>
        <tbody>
          {painel.pessoas.map((item) => (
            <tr key={item.id} className="border-b border-line">
              <td className="py-2 pr-3">{item.nome}</td>
              <td className="py-2 pr-3">{leituraDaCarga(item)}</td>
              <td className="py-2 pr-3">{item.atraso}</td>
              <td className="py-2 pr-3">{item.hoje}</td>
              <td className="py-2 pr-3">{item.perto}</td>
              <td className="py-2 pr-3">{item.frente}</td>
              <td className="py-2">{item.cumpridos}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {escolhido && fila ? (
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-ink">
            {escolhido.nome} · {fila.total} em aberto
          </h2>
          {fila.itens.length === 0 ? (
            <p className="mt-4 text-xl text-ink">
              Nada em aberto no nome deste advogado.
            </p>
          ) : (
            <ul className="mt-4">
              {fila.itens.map((item) => (
                <li key={item.id} className="mt-3 border-b border-line pb-3">
                  <p className="text-xl font-semibold text-ink">
                    {item.titulo}
                  </p>
                  <p className="mt-1 text-lg text-ink">
                    {rotuloArea(item.area)} · {dataBr(item.data)}
                    {item.processo ? ` · ${item.processo}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
