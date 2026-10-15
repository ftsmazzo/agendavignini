import { and, asc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormularioAdiar } from "@/components/formulario-adiar";
import { obterDb } from "@/db/client";
import { prazos, prazosUsuarios, usuarios } from "@/db/schema";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr, dataIsoValida } from "@/lib/datas";
import { diaUtilSeguinte, ehDiaUtil } from "@/lib/publicacao";
import { faixaDaArea, rotuloArea } from "@/lib/resumo";

function destinoPadrao(origem: string, hoje: string) {
  const seguinte = diaUtilSeguinte(origem);
  if (seguinte >= hoje) {
    return seguinte;
  }
  return ehDiaUtil(hoje) ? hoje : diaUtilSeguinte(hoje);
}

export default function Adiar({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; destino?: string; adiados?: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-muted">Abrindo o dia para adiar.</p>}
    >
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

async function Lista({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; destino?: string; adiados?: string }>;
}) {
  await connection();
  const {
    dia: diaPedido,
    destino: destinoPedido,
    adiados,
  } = await searchParams;
  const hoje = hojeNoEscritorio();
  const dia = diaPedido && dataIsoValida(diaPedido) ? diaPedido : hoje;
  const sugerido = destinoPadrao(dia, hoje);
  const destino =
    destinoPedido &&
    ehDiaUtil(destinoPedido) &&
    destinoPedido >= hoje &&
    destinoPedido > dia
      ? destinoPedido
      : sugerido;
  const db = obterDb();
  const itens = await db
    .select({
      id: prazos.id,
      area: prazos.area,
      titulo: prazos.titulo,
      processo: sql<
        string | null
      >`substring((${prazos.titulo} || ' ' || ${prazos.observacao} || ' ' || ${prazos.conteudo}) from '[0-9]{7}-[0-9]{2}\\.[0-9]{4}\\.[0-9]\\.[0-9]{2}\\.[0-9]{4}')`,
    })
    .from(prazos)
    .where(and(eq(prazos.data, dia), eq(prazos.situacao, "aberto")))
    .orderBy(asc(prazos.titulo), asc(prazos.id));
  const ids = itens.map((item) => item.id);
  const vinculos =
    ids.length === 0
      ? []
      : await db
          .select({
            prazoId: prazosUsuarios.prazoId,
            nome: usuarios.nome,
            sobrenome: usuarios.sobrenome,
          })
          .from(prazosUsuarios)
          .innerJoin(usuarios, eq(usuarios.id, prazosUsuarios.usuarioId))
          .where(inArray(prazosUsuarios.prazoId, ids))
          .orderBy(asc(usuarios.nome));
  const advogados = new Map<number, string[]>();
  for (const vinculo of vinculos) {
    const lista = advogados.get(vinculo.prazoId) ?? [];
    lista.push(`${vinculo.nome} ${vinculo.sobrenome}`.trim());
    advogados.set(vinculo.prazoId, lista);
  }
  const ordem = { administrativo: 0, civil: 1, trabalhista: 2 };
  itens.sort(
    (a, b) =>
      ordem[a.area] - ordem[b.area] ||
      a.titulo.localeCompare(b.titulo, "pt-BR"),
  );
  const quantidade = /^\d{1,4}$/.test(adiados ?? "") ? Number(adiados) : 0;

  return (
    <section className="w-full">
      <h1 className="titulo-pagina">Adiar</h1>
      <p className="subtitulo-pagina">
        Move prazos em aberto para outro dia útil. O prazo cumprido fica no dia
        em que estava.
      </p>
      <p className="mt-2 text-2xl font-semibold text-ink">{dataBr(dia)}</p>
      {quantidade > 0 ? (
        <output className="aviso aviso-ok mt-4 block">
          {quantidade === 1
            ? `1 prazo foi para ${dataBr(destino)}.`
            : `${quantidade} prazos foram para ${dataBr(destino)}.`}
        </output>
      ) : null}
      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="dia" className="mb-2 block text-lg text-ink">
            Dia
          </label>
          <input
            id="dia"
            name="dia"
            type="date"
            defaultValue={dia}
            className="campo"
          />
        </div>
        <button type="submit" className="btn btn-primario">
          Ver dia
        </button>
        <Link href={`/prazos?data=${dia}`} className="btn-texto px-2">
          Abrir a lista do dia
        </Link>
      </form>
      {itens.length === 0 ? (
        <p className="vazio mt-8">Este dia não tem prazo em aberto.</p>
      ) : (
        <FormularioAdiar
          key={`${dia}-${destino}`}
          dia={dia}
          destino={destino}
          itens={itens.map((item) => ({
            id: item.id,
            titulo: item.titulo,
            faixa: faixaDaArea(item.area),
            rotulo: rotuloArea(item.area),
            processo: item.processo ?? "",
            advogados: (advogados.get(item.id) ?? []).join(", "),
          }))}
        />
      )}
    </section>
  );
}
