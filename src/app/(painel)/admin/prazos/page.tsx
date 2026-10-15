import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { classeCampo } from "@/components/campo";
import { obterDb } from "@/db/client";
import { prazos, usuarios } from "@/db/schema";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr, dataIsoValida } from "@/lib/datas";
import { faixaDaArea, rotuloArea, statusDoPrazo } from "@/lib/resumo";

export default function ListarPrazosAdmin({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; ano?: string; excluido?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-muted">Abrindo os prazos.</p>}>
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

function BotaoNovo() {
  return (
    <Link href="/admin/prazos/novo" className="btn btn-primario">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      Adicionar novo
    </Link>
  );
}

async function Lista({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; ano?: string; excluido?: string }>;
}) {
  const { data, ano, excluido } = await searchParams;
  await connection();
  const hoje = hojeNoEscritorio();
  const dia = data && dataIsoValida(data) ? data : null;
  const db = obterDb();
  if (!dia) {
    const anoAtual = Number(hoje.slice(0, 4));
    const anoPedido = ano && /^\d{4}$/.test(ano) ? Number(ano) : anoAtual;
    const anos = await db
      .select({
        ano: sql<number>`extract(year from ${prazos.data})::int`,
      })
      .from(prazos)
      .where(isNotNull(prazos.data))
      .groupBy(sql`extract(year from ${prazos.data})`)
      .orderBy(desc(sql`extract(year from ${prazos.data})`));
    const datas = await db
      .select({
        data: prazos.data,
        total: sql<number>`count(*)::int`,
      })
      .from(prazos)
      .where(
        and(
          isNotNull(prazos.data),
          sql`extract(year from ${prazos.data}) = ${anoPedido}`,
        ),
      )
      .groupBy(prazos.data)
      .orderBy(desc(prazos.data));

    return (
      <section className="entrada mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="titulo-pagina">Prazos por data</h1>
            <p className="subtitulo-pagina">
              Escolha o ano e abra o dia que você quer conferir.
            </p>
          </div>
          <BotaoNovo />
        </div>
        <nav aria-label="Anos" className="mt-6 flex flex-wrap gap-2">
          {anos.map((item) => (
            <Link
              key={item.ano}
              href={`/admin/prazos?ano=${item.ano}`}
              aria-current={item.ano === anoPedido ? "page" : undefined}
              className="chip"
            >
              {item.ano}
            </Link>
          ))}
        </nav>
        <form
          method="get"
          className="cartao mt-6 flex flex-wrap items-end gap-3 p-4"
        >
          <div>
            <label htmlFor="data" className="rotulo-campo">
              Ir para uma data
            </label>
            <input id="data" name="data" type="date" className={classeCampo} />
          </div>
          <button type="submit" className="btn btn-primario">
            Ver
          </button>
        </form>
        <p className="mt-6 text-muted">
          {datas.length === 1 ? "1 data." : `${datas.length} datas.`}
        </p>
        {datas.length === 0 ? (
          <p className="vazio mt-4">Nenhum prazo neste ano.</p>
        ) : (
          <ul className="lista-cartoes mt-4">
            {datas.map((item) => (
              <li key={item.data}>
                <Link
                  href={`/admin/prazos?data=${item.data}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 text-ink"
                >
                  <span className="font-medium">
                    {item.data ? dataBr(item.data) : ""}
                  </span>
                  <span className="selo">
                    {item.total === 1 ? "1 prazo" : `${item.total} prazos`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }
  const itens = await db
    .select({
      id: prazos.id,
      area: prazos.area,
      titulo: prazos.titulo,
      situacao: prazos.situacao,
      observacao: prazos.observacao,
      conteudo: prazos.conteudo,
      cumpridoNome: usuarios.nome,
      cumpridoSobrenome: usuarios.sobrenome,
      cumpridoEm: prazos.cumpridoEm,
    })
    .from(prazos)
    .leftJoin(usuarios, eq(usuarios.id, prazos.cumpridoPorId))
    .where(eq(prazos.data, dia))
    .orderBy(
      sql`case ${prazos.area} when 'administrativo' then 1 when 'civil' then 2 else 3 end`,
      asc(prazos.titulo),
      asc(prazos.id),
    )
    .limit(300);

  return (
    <section className="entrada mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="titulo-pagina">Prazos de {dataBr(dia)}</h1>
          <p className="subtitulo-pagina">
            <Link
              href={`/admin/prazos?ano=${dia.slice(0, 4)}`}
              className="btn-texto"
            >
              Todas as datas
            </Link>
          </p>
        </div>
        <BotaoNovo />
      </div>
      {excluido ? (
        <output className="aviso aviso-ok mt-4 block">Prazo excluído.</output>
      ) : null}
      <form
        method="get"
        className="cartao mt-6 flex flex-wrap items-end gap-3 p-4"
      >
        <div>
          <label htmlFor="data" className="rotulo-campo">
            Data
          </label>
          <input
            id="data"
            name="data"
            type="date"
            defaultValue={dia}
            className={classeCampo}
          />
        </div>
        <button type="submit" className="btn btn-primario">
          Ver
        </button>
      </form>
      <p className="mt-6 text-muted">
        {itens.length === 300
          ? "Mostrando os 300 primeiros."
          : `${itens.length} nesta data.`}
      </p>
      {itens.length === 0 ? (
        <p className="vazio mt-4">Nenhum prazo nesta data.</p>
      ) : (
        <ul className="lista-cartoes mt-4">
          {itens.map((item) => (
            <li key={item.id} className={`px-5 py-4 ${faixaDaArea(item.area)}`}>
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <span className="selo">{rotuloArea(item.area)}</span>
                <span
                  className={
                    item.situacao === "cumprido"
                      ? "selo selo-ok"
                      : "selo selo-neutro"
                  }
                >
                  {statusDoPrazo({
                    situacao: item.situacao,
                    cumpridoPor: item.cumpridoNome
                      ? `${item.cumpridoNome} ${item.cumpridoSobrenome ?? ""}`.trim()
                      : null,
                    cumpridoEm: item.cumpridoEm,
                  })}
                </span>
              </p>
              <Link
                href={`/admin/prazos/${item.id}`}
                className="btn-texto mt-2 text-lg"
              >
                {item.titulo}
              </Link>
              {item.observacao ? (
                <p className="mt-2 whitespace-pre-wrap text-ink">
                  {item.observacao}
                </p>
              ) : null}
              {item.conteudo ? (
                <details className="mt-2">
                  <summary className="cursor-pointer font-semibold text-pen">
                    Ver publicação
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-muted">
                    {item.conteudo}
                  </p>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
