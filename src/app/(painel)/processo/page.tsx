import { asc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { cumprir } from "@/app/(painel)/admin/prazos/actions";
import { obterDb } from "@/db/client";
import { audiencias, prazos, prazosUsuarios, usuarios } from "@/db/schema";
import { exigirUsuario } from "@/lib/acesso";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr, dataHoraBr } from "@/lib/datas";
import { formatarProcesso, numeroDoProcesso } from "@/lib/publicacao";
import {
  faixaDaArea,
  marcaDoPrazo,
  rotuloArea,
  statusDoPrazo,
} from "@/lib/resumo";

const TOM = {
  vermelho: "bg-late text-late-ink",
  amarelo: "bg-today-mark text-today-ink",
  verde: "bg-done-mark text-done-ink",
} as const;

function numeroPedido(valor: string | undefined) {
  const texto = (valor ?? "").trim();
  if (numeroDoProcesso(texto) === texto) {
    return texto;
  }
  return formatarProcesso(texto);
}

export default function Processo({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-muted">Abrindo o processo.</p>}>
      <Ficha searchParams={searchParams} />
    </Suspense>
  );
}

async function Ficha({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  await connection();
  const { n } = await searchParams;
  const numero = numeroPedido(n);
  const usuario = await exigirUsuario();
  const hoje = hojeNoEscritorio();
  const admin = usuario.papel === "admin";
  if (!numero) {
    return (
      <section className="w-full">
        <h1 className="titulo-pagina">Processo</h1>
        <p className="vazio mt-8">Informe um número de processo.</p>
      </section>
    );
  }
  const db = obterDb();
  const casa = sql`substring((${prazos.titulo} || ' ' || ${prazos.observacao} || ' ' || ${prazos.conteudo}) from '[0-9]{7}-[0-9]{2}\\.[0-9]{4}\\.[0-9]\\.[0-9]{2}\\.[0-9]{4}') = ${numero}`;
  const itens = await db
    .select({
      id: prazos.id,
      area: prazos.area,
      data: prazos.data,
      titulo: prazos.titulo,
      situacao: prazos.situacao,
      cumpridoNome: usuarios.nome,
      cumpridoSobrenome: usuarios.sobrenome,
      cumpridoEm: prazos.cumpridoEm,
    })
    .from(prazos)
    .leftJoin(usuarios, eq(usuarios.id, prazos.cumpridoPorId))
    .where(casa)
    .orderBy(asc(prazos.data), asc(prazos.id))
    .limit(200);
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
  const digitos = numero.replace(/\D/g, "");
  const sessoes = await db
    .select({
      id: audiencias.id,
      dataHora: audiencias.dataHora,
      vara: audiencias.vara,
      local: audiencias.local,
      reclamante: audiencias.reclamante,
      reclamado: audiencias.reclamado,
    })
    .from(audiencias)
    .where(
      sql`regexp_replace(${audiencias.numeroProcesso}, '\\D', '', 'g') = ${digitos}`,
    )
    .orderBy(sql`${audiencias.dataHora} desc`)
    .limit(40);
  const abertos = itens.filter((item) => item.situacao === "aberto");
  const cumpridos = itens
    .filter((item) => item.situacao === "cumprido")
    .reverse();
  const voltar = `/processo?n=${encodeURIComponent(numero)}`;

  return (
    <section className="w-full">
      <h1 className="titulo-pagina">{numero}</h1>
      <p className="subtitulo-pagina">
        {itens.length === 1 ? "1 prazo" : `${itens.length} prazos`}
        {abertos.length > 0
          ? `, ${abertos.length === 1 ? "1 em aberto" : `${abertos.length} em aberto`}`
          : ""}
        {sessoes.length > 0
          ? `, ${sessoes.length === 1 ? "1 audiência" : `${sessoes.length} audiências`}`
          : ""}
        .
      </p>
      {itens.length === 200 ? (
        <p className="mt-2 text-muted">Mostrando os 200 primeiros prazos.</p>
      ) : null}
      {itens.length === 0 && sessoes.length === 0 ? (
        <p className="vazio mt-8">Nenhum prazo ou audiência com esse número.</p>
      ) : null}
      {abertos.length > 0 ? (
        <Grupo
          titulo="Em aberto"
          itens={abertos}
          advogados={advogados}
          hoje={hoje}
          admin={admin}
          voltar={voltar}
        />
      ) : null}
      {cumpridos.length > 0 ? (
        <Grupo
          titulo="Cumpridos"
          itens={cumpridos}
          advogados={advogados}
          hoje={hoje}
          admin={admin}
          voltar={voltar}
        />
      ) : null}
      {sessoes.length > 0 ? (
        <div className="mt-10">
          <h2 className="titulo-secao">Audiências</h2>
          <ul className="lista-cartoes mt-4">
            {sessoes.map((item) => (
              <li key={item.id} className="px-5 py-4">
                <p>
                  <span className="selo selo-audiencia">
                    {dataHoraBr(item.dataHora)}
                    {item.vara ? ` · ${item.vara}` : ""}
                  </span>
                </p>
                <p className="mt-2 text-lg text-ink">
                  {[item.reclamante, item.reclamado]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {item.local ? (
                  <p className="mt-1 text-base text-muted">{item.local}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Grupo({
  titulo,
  itens,
  advogados,
  hoje,
  admin,
  voltar,
}: {
  titulo: string;
  itens: Array<{
    id: number;
    area: "administrativo" | "civil" | "trabalhista";
    data: string;
    titulo: string;
    situacao: "aberto" | "cumprido";
    cumpridoNome: string | null;
    cumpridoSobrenome: string | null;
    cumpridoEm: Date | null;
  }>;
  advogados: Map<number, string[]>;
  hoje: string;
  admin: boolean;
  voltar: string;
}) {
  return (
    <div className="mt-8">
      <h2 className="titulo-secao">
        {titulo} · {itens.length}
      </h2>
      <ul className="lista-cartoes mt-4">
        {itens.map((item) => {
          const marca = marcaDoPrazo(item.situacao, item.data, hoje);
          const nomes = advogados.get(item.id) ?? [];
          return (
            <li key={item.id} className={`px-5 py-4 ${faixaDaArea(item.area)}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex flex-wrap items-center gap-2 text-[0.9375rem] text-muted">
                  <span className="selo">{rotuloArea(item.area)}</span>
                  <Link
                    href={`/prazos?data=${item.data}`}
                    className="btn-texto"
                  >
                    {dataBr(item.data)}
                  </Link>
                  {statusDoPrazo({
                    situacao: item.situacao,
                    cumpridoPor: item.cumpridoNome
                      ? `${item.cumpridoNome} ${item.cumpridoSobrenome ?? ""}`.trim()
                      : null,
                    cumpridoEm: item.cumpridoEm,
                  })}
                </p>
                <span
                  className={`inline-flex rounded-full px-3 py-0.5 text-[0.8125rem] font-semibold ${TOM[marca.tom]}`}
                >
                  {marca.texto}
                </span>
              </div>
              <h3 className="mt-2 text-xl font-semibold text-ink">
                {item.titulo}
              </h3>
              {nomes.length > 0 ? (
                <p className="mt-1 text-base text-muted">{nomes.join(", ")}</p>
              ) : (
                <p className="mt-1 text-base text-muted">
                  Sem advogado marcado
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {item.situacao === "aberto" ? (
                  <form action={cumprir}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="voltar" value={voltar} />
                    <button
                      type="submit"
                      className="btn btn-sucesso btn-pequeno"
                    >
                      Cumprir
                    </button>
                  </form>
                ) : null}
                {admin ? (
                  <>
                    <Link
                      href={`/admin/prazos/${item.id}`}
                      className="btn btn-pequeno"
                    >
                      Editar
                    </Link>
                    <Link
                      href={`/admin/prazos/novo?copia=${item.id}`}
                      className="btn btn-pequeno"
                    >
                      Criar outro igual
                    </Link>
                  </>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
