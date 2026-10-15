import { and, asc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { cumprir } from "@/app/(painel)/admin/prazos/actions";
import { obterDb } from "@/db/client";
import { prazos } from "@/db/schema";
import { exigirUsuario } from "@/lib/acesso";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr } from "@/lib/datas";
import { faixaDaArea, marcaDoPrazo, rotuloArea } from "@/lib/resumo";

const SELO = {
  vermelho: "bg-late text-late-ink",
  amarelo: "bg-today-mark text-today-ink",
  verde: "bg-done-mark text-done-ink",
} as const;

export default function MeusPrazos() {
  return (
    <Suspense
      fallback={<p className="text-xl text-muted">Abrindo os seus prazos.</p>}
    >
      <Lista />
    </Suspense>
  );
}

async function Lista() {
  await connection();
  const usuario = await exigirUsuario();
  const hoje = hojeNoEscritorio();
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
    .where(
      and(
        eq(prazos.situacao, "aberto"),
        sql`exists (select 1 from prazos_usuarios where prazo_id = ${prazos.id} and usuario_id = ${usuario.id})`,
      ),
    )
    .orderBy(asc(prazos.data), asc(prazos.titulo), asc(prazos.id))
    .limit(300);
  const grupos = [
    {
      titulo: "Em atraso",
      itens: itens.filter((item) => item.data < hoje),
    },
    {
      titulo: "Hoje",
      itens: itens.filter((item) => item.data === hoje),
    },
    {
      titulo: "À frente",
      itens: itens.filter((item) => item.data > hoje),
    },
  ].filter((grupo) => grupo.itens.length > 0);

  return (
    <section className="w-full">
      <h1 className="text-4xl leading-tight font-bold text-ink">Meus prazos</h1>
      <p className="mt-3 text-xl text-muted">
        Prazos em aberto que estão no seu nome.
      </p>
      <p className="mt-2 text-2xl text-ink">
        {itens.length === 300
          ? "Mostrando os 300 primeiros."
          : itens.length === 1
            ? "1 prazo em aberto."
            : `${itens.length} prazos em aberto.`}
      </p>
      {itens.length === 0 ? (
        <div className="mt-8">
          <p className="text-xl text-ink">
            Nenhum prazo em aberto está no seu nome.
          </p>
          {usuario.papel === "admin" ? (
            <p className="mt-4">
              <Link
                href="/admin/prazos/sem-advogado"
                className="text-lg font-semibold text-pen"
              >
                Marcar os sem advogado
              </Link>
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {grupos.map((grupo) => (
            <section key={grupo.titulo}>
              <h2 className="text-2xl font-bold text-ink">
                {grupo.titulo} · {grupo.itens.length}
              </h2>
              <ul className="mt-4 divide-y divide-line border border-line bg-sheet">
                {grupo.itens.map((item) => {
                  const marca = marcaDoPrazo(item.situacao, item.data, hoje);
                  return (
                    <li
                      key={item.id}
                      className={`px-5 py-4 ${faixaDaArea(item.area)}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-lg text-muted">
                          {rotuloArea(item.area)} · {dataBr(item.data)}
                        </p>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-base font-semibold ${SELO[marca.tom]}`}
                        >
                          {marca.texto}
                        </span>
                      </div>
                      <h3 className="mt-1 text-2xl font-semibold text-ink">
                        <Link
                          href={`/prazos?data=${item.data}`}
                          className="text-ink"
                        >
                          {item.titulo}
                        </Link>
                      </h3>
                      <form action={cumprir} className="mt-3">
                        <input type="hidden" name="id" value={item.id} />
                        <input
                          type="hidden"
                          name="voltar"
                          value="/prazos/meus"
                        />
                        <button
                          type="submit"
                          className="bg-pen px-4 py-2 text-lg font-semibold text-sheet"
                        >
                          Cumprir
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
