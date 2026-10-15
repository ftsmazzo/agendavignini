import { and, asc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormularioCumprir } from "@/components/formulario-cumprir";
import { obterDb } from "@/db/client";
import { prazos, prazosUsuarios, usuarios } from "@/db/schema";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr, dataIsoValida } from "@/lib/datas";
import { faixaDaArea, marcaDoPrazo, rotuloArea } from "@/lib/resumo";

const SELO = {
  vermelho: "bg-late text-late-ink",
  amarelo: "bg-today-mark text-today-ink",
  verde: "bg-done-mark text-done-ink",
} as const;

export default function CumprirVarios({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; cumpridos?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <p className="text-xl text-muted">Abrindo o dia para cumprir.</p>
      }
    >
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

async function Lista({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; cumpridos?: string }>;
}) {
  await connection();
  const { dia: diaPedido, cumpridos } = await searchParams;
  const hoje = hojeNoEscritorio();
  const dia = diaPedido && dataIsoValida(diaPedido) ? diaPedido : hoje;
  const db = obterDb();
  const itens = await db
    .select({
      id: prazos.id,
      area: prazos.area,
      data: prazos.data,
      titulo: prazos.titulo,
      situacao: prazos.situacao,
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
  const quantidade = /^\d{1,4}$/.test(cumpridos ?? "") ? Number(cumpridos) : 0;

  return (
    <section className="w-full">
      <h1 className="text-4xl leading-tight font-bold text-ink">
        Cumprir vários
      </h1>
      <p className="mt-3 text-xl text-muted">
        Marca como cumpridos os prazos em aberto deste dia. O registro fica no
        seu nome.
      </p>
      <p className="mt-2 text-2xl text-ink">{dataBr(dia)}</p>
      {quantidade > 0 ? (
        <output className="mt-4 block text-xl text-done">
          {quantidade === 1
            ? "1 prazo cumprido."
            : `${quantidade} prazos cumpridos.`}
        </output>
      ) : null}
      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="dia" className="mb-2 block text-xl text-ink">
            Dia
          </label>
          <input
            id="dia"
            name="dia"
            type="date"
            defaultValue={dia}
            className="border border-line bg-sheet px-4 py-3 text-xl text-ink"
          />
        </div>
        <button
          type="submit"
          className="bg-pen px-4 py-3 text-lg font-semibold text-sheet"
        >
          Ver dia
        </button>
        <Link
          href={`/prazos?data=${dia}`}
          className="px-2 py-3 text-lg text-pen"
        >
          Abrir a lista do dia
        </Link>
        {dia < hoje ? (
          <Link
            href={`/prazos/atraso?dia=${dia}`}
            className="px-2 py-3 text-lg text-pen"
          >
            Ver na fila de atraso
          </Link>
        ) : null}
      </form>
      {itens.length === 0 ? (
        <p className="mt-8 text-xl text-ink">
          Este dia não tem prazo em aberto.
        </p>
      ) : (
        <FormularioCumprir
          key={dia}
          dia={dia}
          origem="cumprir"
          itens={itens.map((item) => {
            const marca = marcaDoPrazo(item.situacao, item.data, hoje);
            return {
              id: item.id,
              titulo: item.titulo,
              faixa: faixaDaArea(item.area),
              rotulo: rotuloArea(item.area),
              marca: marca.texto,
              selo: SELO[marca.tom],
              advogados: (advogados.get(item.id) ?? []).join(", "),
            };
          })}
        />
      )}
    </section>
  );
}
