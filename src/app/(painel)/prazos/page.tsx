import { and, asc, eq, sql } from "drizzle-orm";
import { Suspense } from "react";
import { obterDb } from "@/db/client";
import { prazos } from "@/db/schema";
import { hojeNoEscritorio } from "@/lib/contagens";

export default function Prazos({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; quando?: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-xl text-muted">Abrindo os prazos.</p>}
    >
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

function tituloDaLista(quando: string | undefined, data: string | undefined) {
  if (quando === "hoje") {
    return "Prazos de hoje";
  }
  if (quando === "semana") {
    return "Prazos da semana";
  }
  if (data) {
    const [ano, mes, dia] = data.split("-");
    return `Prazos de ${dia}/${mes}/${ano}`;
  }
  return "Prazos";
}

async function Lista({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; quando?: string }>;
}) {
  const { data, quando } = await searchParams;
  const hoje = hojeNoEscritorio();
  const dataPedida = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : null;
  const db = obterDb();
  const filtro =
    quando === "hoje"
      ? eq(prazos.data, hoje)
      : quando === "semana"
        ? sql`extract(week from ${prazos.data}) = extract(week from ${hoje}::date) and extract(year from ${prazos.data}) = extract(year from ${hoje}::date)`
        : dataPedida
          ? eq(prazos.data, dataPedida)
          : sql`false`;

  const itens = await db
    .select({
      id: prazos.id,
      area: prazos.area,
      data: prazos.data,
      titulo: prazos.titulo,
      observacao: prazos.observacao,
      conteudo: prazos.conteudo,
      situacao: prazos.situacao,
    })
    .from(prazos)
    .where(and(filtro))
    .orderBy(asc(prazos.data), asc(prazos.id))
    .limit(300);

  return (
    <section className="mx-auto w-full max-w-5xl">
      <h1 className="text-4xl leading-tight font-bold text-ink">
        {tituloDaLista(quando, dataPedida ?? undefined)}
      </h1>
      <p className="mt-3 text-xl text-muted">
        {itens.length === 300
          ? "Mostrando os 300 primeiros."
          : `${itens.length} nesta lista.`}
      </p>
      {itens.length === 0 ? (
        <p className="mt-8 text-xl text-ink">Nenhum prazo neste recorte.</p>
      ) : (
        <ul className="mt-8 divide-y divide-line border border-line bg-sheet">
          {itens.map((item) => (
            <li key={item.id} className="px-6 py-5">
              <p className="text-lg text-muted">
                {item.area} · {item.data.split("-").reverse().join("/")} ·{" "}
                {item.situacao === "cumprido" ? "Cumprido" : "Em aberto"}
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-ink">
                {item.titulo}
              </h2>
              {item.observacao ? (
                <p className="mt-3 text-xl whitespace-pre-wrap text-ink">
                  {item.observacao}
                </p>
              ) : null}
              {item.conteudo ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-lg text-pen">
                    Ver publicação
                  </summary>
                  <p className="mt-3 text-lg whitespace-pre-wrap text-ink">
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
