import { and, asc, eq, gte, lte, or, sql } from "drizzle-orm";
import { Suspense } from "react";
import { classeCampo } from "@/components/campo";
import { obterDb } from "@/db/client";
import { prazos, usuarios } from "@/db/schema";
import { dataBr, dataIsoValida } from "@/lib/datas";

export default function Relatorios({
  searchParams,
}: {
  searchParams: Promise<{ advogado?: string; inicio?: string; fim?: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-xl text-muted">Abrindo o relatório.</p>}
    >
      <Painel searchParams={searchParams} />
    </Suspense>
  );
}

async function Painel({
  searchParams,
}: {
  searchParams: Promise<{ advogado?: string; inicio?: string; fim?: string }>;
}) {
  const { advogado, inicio, fim } = await searchParams;
  const db = obterDb();
  const marcados = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      sobrenome: usuarios.sobrenome,
    })
    .from(usuarios)
    .where(and(eq(usuarios.ativo, true), eq(usuarios.entraNoRelatorio, true)))
    .orderBy(asc(usuarios.nome));
  const pessoas =
    marcados.length > 0
      ? marcados
      : await db
          .select({
            id: usuarios.id,
            nome: usuarios.nome,
            sobrenome: usuarios.sobrenome,
          })
          .from(usuarios)
          .where(eq(usuarios.ativo, true))
          .orderBy(asc(usuarios.nome));

  const id = Number(advogado);
  const inicioOk = inicio && dataIsoValida(inicio) ? inicio : "";
  const fimOk = fim && dataIsoValida(fim) ? fim : "";
  const periodoValido =
    Number.isInteger(id) &&
    id > 0 &&
    inicioOk !== "" &&
    fimOk !== "" &&
    inicioOk <= fimOk;
  const escolhido = pessoas.find((pessoa) => pessoa.id === id);
  const itens =
    periodoValido && escolhido
      ? await db
          .select({
            id: prazos.id,
            area: prazos.area,
            data: prazos.data,
            titulo: prazos.titulo,
            situacao: prazos.situacao,
            observacao: prazos.observacao,
          })
          .from(prazos)
          .where(
            and(
              gte(prazos.data, inicioOk),
              lte(prazos.data, fimOk),
              or(
                eq(prazos.cumpridoPorId, id),
                sql`exists (select 1 from prazos_usuarios where prazo_id = ${prazos.id} and usuario_id = ${id})`,
              ),
            ),
          )
          .orderBy(asc(prazos.data), asc(prazos.id))
          .limit(500)
      : [];

  return (
    <section className="mx-auto w-full max-w-5xl">
      <h1 className="text-4xl leading-tight font-bold text-ink">Relatórios</h1>
      <p className="mt-3 text-xl text-muted">
        Prazos do advogado no período, pelos que ele cumpriu ou pelos que estão
        no nome dele.
      </p>
      <form method="get" className="mt-8 grid gap-5 md:grid-cols-3">
        <div>
          <label htmlFor="advogado" className="mb-2 block text-xl text-ink">
            Advogado
          </label>
          <select
            id="advogado"
            name="advogado"
            defaultValue={escolhido ? String(escolhido.id) : ""}
            className={classeCampo}
          >
            {pessoas.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                {`${pessoa.nome} ${pessoa.sobrenome}`.trim()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="inicio" className="mb-2 block text-xl text-ink">
            Data inicial
          </label>
          <input
            id="inicio"
            name="inicio"
            type="date"
            required
            defaultValue={inicio && dataIsoValida(inicio) ? inicio : ""}
            className={classeCampo}
          />
        </div>
        <div>
          <label htmlFor="fim" className="mb-2 block text-xl text-ink">
            Data final
          </label>
          <input
            id="fim"
            name="fim"
            type="date"
            required
            defaultValue={fim && dataIsoValida(fim) ? fim : ""}
            className={classeCampo}
          />
        </div>
        <button
          type="submit"
          className="bg-pen px-4 py-3 text-xl font-bold text-sheet md:col-span-3"
        >
          Exibir relatório
        </button>
      </form>
      {periodoValido && escolhido ? (
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-ink">
            {`${escolhido.nome} ${escolhido.sobrenome}`.trim()} entre{" "}
            {dataBr(inicioOk)} e {dataBr(fimOk)}
          </h2>
          <p className="mt-3 text-xl text-muted">
            {itens.length === 500
              ? "Mostrando os 500 primeiros."
              : `${itens.length} neste período.`}
          </p>
          {itens.length === 0 ? (
            <p className="mt-6 text-xl text-ink">Nenhum prazo neste período.</p>
          ) : (
            <ul className="mt-6 divide-y divide-line border border-line bg-sheet">
              {itens.map((item) => (
                <li key={item.id} className="px-6 py-5">
                  <p className="text-lg text-muted">
                    {item.area} · {dataBr(item.data)} ·{" "}
                    {item.situacao === "cumprido" ? "Cumprido" : "Em aberto"}
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold text-ink">
                    {item.titulo}
                  </h3>
                  {item.observacao ? (
                    <p className="mt-3 text-xl whitespace-pre-wrap text-ink">
                      {item.observacao}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
