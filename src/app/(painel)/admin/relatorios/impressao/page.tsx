import { and, asc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { BotaoImprimir } from "@/components/botao-imprimir";
import { obterDb } from "@/db/client";
import { prazos, prazosUsuarios, usuarios } from "@/db/schema";
import { dataBr, dataIsoValida } from "@/lib/datas";
import { rotuloArea, statusDoPrazo } from "@/lib/resumo";

export default function ImpressaoRelatorio({
  searchParams,
}: {
  searchParams: Promise<{ advogado?: string; inicio?: string; fim?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-xl text-muted">Abrindo a folha.</p>}>
      <Folha searchParams={searchParams} />
    </Suspense>
  );
}

async function Folha({
  searchParams,
}: {
  searchParams: Promise<{ advogado?: string; inicio?: string; fim?: string }>;
}) {
  const { advogado, inicio, fim } = await searchParams;
  const db = obterDb();
  const id = Number(advogado);
  const inicioOk = inicio && dataIsoValida(inicio) ? inicio : "";
  const fimOk = fim && dataIsoValida(fim) ? fim : "";
  const valido =
    Number.isInteger(id) &&
    id > 0 &&
    inicioOk !== "" &&
    fimOk !== "" &&
    inicioOk <= fimOk;
  const [pessoa] = valido
    ? await db
        .select({
          id: usuarios.id,
          nome: usuarios.nome,
          sobrenome: usuarios.sobrenome,
        })
        .from(usuarios)
        .where(eq(usuarios.id, id))
        .limit(1)
    : [];

  const linhas =
    valido && pessoa
      ? await db
          .select({
            id: prazos.id,
            area: prazos.area,
            data: prazos.data,
            titulo: prazos.titulo,
            observacao: prazos.observacao,
            conteudo: prazos.conteudo,
            situacao: prazos.situacao,
            cumpridoNome: usuarios.nome,
            cumpridoSobrenome: usuarios.sobrenome,
            cumpridoEm: prazos.cumpridoEm,
          })
          .from(prazos)
          .leftJoin(usuarios, eq(usuarios.id, prazos.cumpridoPorId))
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
          .limit(200)
      : [];

  const ids = linhas.map((linha) => linha.id);
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
  const nome = pessoa ? `${pessoa.nome} ${pessoa.sobrenome}`.trim() : "";

  return (
    <section className="mx-auto w-full max-w-4xl">
      <div className="nao-imprimir flex flex-wrap items-center gap-3">
        <BotaoImprimir />
        <Link
          href={
            valido
              ? `/admin/relatorios?advogado=${id}&inicio=${inicioOk}&fim=${fimOk}`
              : "/admin/relatorios"
          }
          className="text-lg text-pen"
        >
          Voltar
        </Link>
      </div>
      <h1 className="mt-6 text-4xl leading-tight font-bold text-ink">
        {nome
          ? `Relatório de ${nome} entre ${dataBr(inicioOk)} e ${dataBr(fimOk)}`
          : "Informe o advogado e o período"}
      </h1>
      {linhas.length === 200 ? (
        <p className="mt-4 text-xl text-ink">Mostrando os 200 primeiros.</p>
      ) : null}
      {linhas.length === 0 ? (
        <p className="mt-8 text-xl text-ink">Nenhum prazo nesta folha.</p>
      ) : (
        linhas.map((item) => (
          <article key={item.id} className="mt-8 border-b border-line pb-6">
            <h2 className="text-2xl font-bold text-ink">{item.titulo}</h2>
            <p className="mt-2 text-lg text-ink">
              {rotuloArea(item.area)} · {dataBr(item.data)} ·{" "}
              {statusDoPrazo({
                id: item.id,
                area: item.area,
                data: item.data,
                titulo: item.titulo,
                conteudo: item.conteudo,
                situacao: item.situacao,
                cumpridoPor: item.cumpridoNome
                  ? `${item.cumpridoNome} ${item.cumpridoSobrenome ?? ""}`.trim()
                  : null,
                cumpridoEm: item.cumpridoEm,
              })}
            </p>
            {(advogados.get(item.id) ?? []).length > 0 ? (
              <p className="mt-4 text-xl text-ink">
                <strong>Advogados:</strong>{" "}
                {(advogados.get(item.id) ?? []).join(", ")}
              </p>
            ) : null}
            {item.observacao ? (
              <p className="mt-4 text-xl whitespace-pre-wrap text-ink">
                <strong>Observação:</strong>
                {"\n"}
                {item.observacao}
              </p>
            ) : null}
            {item.conteudo ? (
              <p className="mt-4 text-xl whitespace-pre-wrap text-ink">
                <strong>Descrição:</strong>
                {"\n"}
                {item.conteudo}
              </p>
            ) : null}
          </article>
        ))
      )}
    </section>
  );
}
