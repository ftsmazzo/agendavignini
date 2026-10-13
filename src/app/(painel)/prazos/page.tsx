import { and, asc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import {
  cumprir,
  desfazer,
  excluirPrazo,
} from "@/app/(painel)/admin/prazos/actions";
import { BotaoExcluir } from "@/components/botao-excluir";
import { obterDb } from "@/db/client";
import { prazos } from "@/db/schema";
import { exigirUsuario } from "@/lib/acesso";
import { hojeNoEscritorio } from "@/lib/contagens";

export default function Prazos({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; quando?: string; excluido?: string }>;
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
  searchParams: Promise<{ data?: string; quando?: string; excluido?: string }>;
}) {
  const { data, quando, excluido } = await searchParams;
  const usuario = await exigirUsuario();
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

  const voltar =
    quando === "hoje"
      ? "/prazos?quando=hoje"
      : quando === "semana"
        ? "/prazos?quando=semana"
        : dataPedida
          ? `/prazos?data=${dataPedida}`
          : "/prazos";

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
      {quando === "hoje" || dataPedida ? (
        <p className="mt-3">
          <Link
            href={`/prazos/impressao?data=${quando === "hoje" ? hoje : dataPedida}`}
            className="text-lg text-pen"
          >
            Imprimir este dia
          </Link>
        </p>
      ) : null}
      {excluido ? (
        <output className="mt-4 block text-xl text-done">
          Prazo excluído.
        </output>
      ) : null}
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
              <div className="mt-4 flex flex-wrap gap-3">
                {item.situacao === "aberto" ? (
                  <form action={cumprir}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="voltar" value={voltar} />
                    <button
                      type="submit"
                      className="bg-pen px-4 py-2 text-lg font-semibold text-sheet"
                    >
                      Cumprir
                    </button>
                  </form>
                ) : null}
                {usuario.papel === "admin" && item.situacao === "cumprido" ? (
                  <form action={desfazer}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="voltar" value={voltar} />
                    <button
                      type="submit"
                      className="border border-line bg-sheet px-4 py-2 text-lg font-semibold text-ink"
                    >
                      Desfazer
                    </button>
                  </form>
                ) : null}
                {usuario.papel === "admin" ? (
                  <>
                    <Link
                      href={`/admin/prazos/${item.id}`}
                      className="border border-line bg-sheet px-4 py-2 text-lg font-semibold text-ink"
                    >
                      Editar
                    </Link>
                    <BotaoExcluir
                      action={excluirPrazo}
                      pergunta="Excluir este prazo?"
                      rotulo="Excluir"
                    >
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="voltar" value={voltar} />
                    </BotaoExcluir>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
