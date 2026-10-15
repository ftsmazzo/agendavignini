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
      fallback={<p className="text-muted">Abrindo o dia para cumprir.</p>}
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
    <section className="entrada mx-auto w-full max-w-5xl">
      <h1 className="titulo-pagina">Cumprir vários</h1>
      <p className="subtitulo-pagina">
        Marca como cumpridos os prazos em aberto deste dia. O registro fica no
        seu nome.
      </p>
      <p className="mt-3">
        <span className="selo">{dataBr(dia)}</span>
      </p>
      {quantidade > 0 ? (
        <output className="aviso aviso-ok mt-4 block">
          {quantidade === 1
            ? "1 prazo cumprido."
            : `${quantidade} prazos cumpridos.`}
        </output>
      ) : null}
      <form
        method="get"
        className="cartao mt-6 flex flex-wrap items-end gap-3 p-5"
      >
        <div>
          <label htmlFor="dia" className="rotulo-campo">
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
        <Link href={`/prazos?data=${dia}`} className="btn-texto px-2 py-3">
          Abrir a lista do dia
        </Link>
        {dia < hoje ? (
          <Link
            href={`/prazos/atraso?dia=${dia}`}
            className="btn-texto px-2 py-3"
          >
            Ver na fila de atraso
          </Link>
        ) : null}
      </form>
      {itens.length === 0 ? (
        <p className="vazio mt-8">Este dia não tem prazo em aberto.</p>
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
