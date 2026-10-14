import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormularioRetirar } from "@/components/formulario-retirar";
import { obterDb } from "@/db/client";
import { prazos, prazosUsuarios, usuarios } from "@/db/schema";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr, dataIsoValida } from "@/lib/datas";
import { faixaDaArea, rotuloArea } from "@/lib/resumo";

export default function TirarAdvogado({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; retirados?: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-xl text-muted">Abrindo os vínculos.</p>}
    >
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

async function Lista({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; retirados?: string }>;
}) {
  await connection();
  const { dia: diaPedido, retirados } = await searchParams;
  const hoje = hojeNoEscritorio();
  const db = obterDb();
  const comVinculo = sql`exists (select 1 from prazos_usuarios where prazo_id = ${prazos.id})`;
  const dias = await db
    .select({
      data: prazos.data,
      total: sql<number>`count(distinct ${prazos.id})::int`,
    })
    .from(prazos)
    .where(and(gte(prazos.data, hoje), comVinculo))
    .groupBy(prazos.data)
    .orderBy(asc(prazos.data));
  const pedido =
    diaPedido && dataIsoValida(diaPedido) && diaPedido >= hoje ? diaPedido : "";
  const dia = dias.some((item) => item.data === pedido)
    ? pedido
    : (dias[0]?.data ?? hoje);
  const indice = dias.findIndex((item) => item.data === dia);
  const anterior = indice > 0 ? dias[indice - 1] : undefined;
  const proximo = indice >= 0 ? dias[indice + 1] : undefined;
  const linhas =
    dias.length === 0
      ? []
      : await db
          .select({
            id: prazos.id,
            area: prazos.area,
            titulo: prazos.titulo,
          })
          .from(prazos)
          .where(and(eq(prazos.data, dia), comVinculo))
          .orderBy(asc(prazos.titulo), asc(prazos.id));
  const ids = linhas.map((item) => item.id);
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
  const nomes = new Map<number, string[]>();
  for (const vinculo of vinculos) {
    const lista = nomes.get(vinculo.prazoId) ?? [];
    lista.push(`${vinculo.nome} ${vinculo.sobrenome}`.trim());
    nomes.set(vinculo.prazoId, lista);
  }
  const ordem = { administrativo: 0, civil: 1, trabalhista: 2 };
  const itens = linhas
    .map((item) => ({
      id: item.id,
      titulo: item.titulo,
      faixa: faixaDaArea(item.area),
      rotulo: rotuloArea(item.area),
      advogados: (nomes.get(item.id) ?? []).join(", "),
      area: item.area,
    }))
    .sort(
      (a, b) =>
        ordem[a.area] - ordem[b.area] ||
        a.titulo.localeCompare(b.titulo, "pt-BR"),
    );
  const quantidade = /^\d{1,4}$/.test(retirados ?? "") ? Number(retirados) : 0;

  return (
    <section className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl leading-tight font-bold text-ink">
            Tirar advogado
          </h1>
          <p className="mt-3 text-xl text-muted">
            Tira o responsável dos prazos de hoje em diante. O prazo volta para
            a lista sem advogado.
          </p>
        </div>
        <Link
          href="/admin/prazos/sem-advogado"
          className="text-lg font-semibold text-pen"
        >
          Sem advogado
        </Link>
      </div>
      {quantidade > 0 ? (
        <output className="mt-4 block text-xl text-done">
          {quantidade === 1
            ? "1 prazo voltou a ficar sem advogado."
            : `${quantidade} prazos voltaram a ficar sem advogado.`}
        </output>
      ) : null}
      {dias.length === 0 ? (
        <p className="mt-8 text-xl text-ink">
          De hoje em diante, nenhum prazo tem advogado marcado.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            {anterior ? (
              <Link
                href={`/admin/prazos/tirar-advogado?dia=${anterior.data}`}
                className="border border-line bg-sheet px-4 py-3 text-lg font-semibold text-ink"
              >
                Anterior
                <span className="mt-1 block text-base font-normal text-muted">
                  {dataBr(anterior.data)} · {anterior.total}
                </span>
              </Link>
            ) : (
              <span />
            )}
            <h2 className="text-center text-3xl font-bold text-ink">
              {dataBr(dia)}
              <span className="mt-1 block text-lg font-normal text-muted">
                {itens.length === 1 ? "1 prazo" : `${itens.length} prazos`}
              </span>
            </h2>
            {proximo ? (
              <Link
                href={`/admin/prazos/tirar-advogado?dia=${proximo.data}`}
                className="border border-line bg-sheet px-4 py-3 text-right text-lg font-semibold text-ink"
              >
                Próximo
                <span className="mt-1 block text-base font-normal text-muted">
                  {dataBr(proximo.data)} · {proximo.total}
                </span>
              </Link>
            ) : (
              <span />
            )}
          </div>
          <FormularioRetirar
            key={dia}
            dia={dia}
            itens={itens.map((item) => ({
              id: item.id,
              titulo: item.titulo,
              faixa: item.faixa,
              rotulo: item.rotulo,
              advogados: item.advogados,
            }))}
          />
        </>
      )}
    </section>
  );
}
