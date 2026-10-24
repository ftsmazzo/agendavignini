import { and, asc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { cumprir } from "@/app/(painel)/admin/prazos/actions";
import { BotaoCumprir } from "@/components/botao-cumprir";
import { obterDb } from "@/db/client";
import { prazos } from "@/db/schema";
import { exigirUsuario } from "@/lib/acesso";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr } from "@/lib/datas";
import {
  faixaDaArea,
  marcaDoPrazo,
  prazoEhDefesa,
  rotuloArea,
} from "@/lib/resumo";

const SELO = {
  vermelho: "bg-late text-late-ink",
  amarelo: "bg-today-mark text-today-ink",
  verde: "bg-done-mark text-done-ink",
} as const;

export default function MeusPrazos() {
  return (
    <Suspense fallback={<p className="text-muted">Abrindo os seus prazos.</p>}>
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
      defesa: prazos.defesa,
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
    <section className="entrada mx-auto w-full max-w-5xl">
      <h1 className="titulo-pagina">Meus prazos</h1>
      <p className="subtitulo-pagina">
        Prazos em aberto que estão no seu nome.
      </p>
      <p className="mt-3">
        <span className="selo">
          {itens.length === 300
            ? "Mostrando os 300 primeiros."
            : itens.length === 1
              ? "1 prazo em aberto."
              : `${itens.length} prazos em aberto.`}
        </span>
      </p>
      {itens.length === 0 ? (
        <div className="vazio mt-8">
          <p>Nenhum prazo em aberto está no seu nome.</p>
          {usuario.papel === "admin" ? (
            <p className="mt-4">
              <Link href="/admin/prazos/sem-advogado" className="btn">
                Marcar os sem advogado
              </Link>
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {grupos.map((grupo) => (
            <section key={grupo.titulo}>
              <h2 className="titulo-secao">
                {grupo.titulo}{" "}
                <span
                  className={`selo ${grupo.titulo === "Em atraso" ? "selo-atraso" : "selo-neutro"}`}
                >
                  {grupo.itens.length}
                </span>
              </h2>
              <ul className="lista-cartoes mt-3">
                {grupo.itens.map((item) => {
                  const marca = marcaDoPrazo(item.situacao, item.data, hoje);
                  return (
                    <li
                      key={item.id}
                      className={`px-5 py-4 ${faixaDaArea(item.area, item.situacao, prazoEhDefesa(item.defesa, item.titulo))}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="flex flex-wrap items-center gap-2 text-[0.9375rem] text-muted">
                          <span className="selo">{rotuloArea(item.area)}</span>
                          {dataBr(item.data)}
                        </p>
                        <span
                          className={`inline-flex rounded-full px-3 py-0.5 text-[0.8125rem] font-semibold ${SELO[marca.tom]}`}
                        >
                          {marca.texto}
                        </span>
                      </div>
                      <h3 className="mt-1 text-base leading-tight font-semibold text-ink">
                        <Link
                          href={`/prazos?data=${item.data}`}
                          className="text-ink hover:text-pen"
                        >
                          {item.titulo}
                        </Link>
                      </h3>
                      <BotaoCumprir action={cumprir} className="mt-3">
                        <input type="hidden" name="id" value={item.id} />
                        <input
                          type="hidden"
                          name="voltar"
                          value="/prazos/meus"
                        />
                      </BotaoCumprir>
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
