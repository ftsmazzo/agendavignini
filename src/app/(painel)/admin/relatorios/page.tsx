import { and, asc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import {
  cumprir,
  desfazer,
  excluirPrazo,
} from "@/app/(painel)/admin/prazos/actions";
import { BotaoExcluir } from "@/components/botao-excluir";
import { classeCampo } from "@/components/campo";
import { CorpoPrazo } from "@/components/corpo-prazo";
import { obterDb } from "@/db/client";
import { prazos, prazosUsuarios, usuarios } from "@/db/schema";
import { dataBr, dataIsoValida } from "@/lib/datas";
import { faixaDaArea, rotuloArea, statusDoPrazo } from "@/lib/resumo";

const AREAS = ["administrativo", "civil", "trabalhista"] as const;

function consultaRelatorio(base: {
  advogado: number;
  inicio: string;
  fim: string;
  area?: string;
  situacao?: string;
  data?: string;
}) {
  const params = new URLSearchParams();
  params.set("advogado", String(base.advogado));
  params.set("inicio", base.inicio);
  params.set("fim", base.fim);
  if (base.area) {
    params.set("area", base.area);
  }
  if (base.situacao) {
    params.set("situacao", base.situacao);
  }
  if (base.data) {
    params.set("data", base.data);
  }
  return `/admin/relatorios?${params}`;
}

export default function Relatorios({
  searchParams,
}: {
  searchParams: Promise<{
    advogado?: string;
    inicio?: string;
    fim?: string;
    area?: string;
    situacao?: string;
    data?: string;
  }>;
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
  searchParams: Promise<{
    advogado?: string;
    inicio?: string;
    fim?: string;
    area?: string;
    situacao?: string;
    data?: string;
  }>;
}) {
  const { advogado, inicio, fim, area, situacao, data } = await searchParams;
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
  const areaOk = AREAS.find((item) => item === area);
  const situacaoOk =
    situacao === "aberto" || situacao === "cumprido" ? situacao : undefined;
  const diaOk =
    data &&
    dataIsoValida(data) &&
    inicioOk &&
    fimOk &&
    data >= inicioOk &&
    data <= fimOk
      ? data
      : "";
  const doAdvogado = and(
    gte(prazos.data, inicioOk),
    lte(prazos.data, fimOk),
    or(
      eq(prazos.cumpridoPorId, id),
      sql`exists (select 1 from prazos_usuarios where prazo_id = ${prazos.id} and usuario_id = ${id})`,
    ),
  );
  const pronto = Boolean(periodoValido && escolhido);
  const filtros = [doAdvogado];
  if (areaOk) {
    filtros.push(eq(prazos.area, areaOk));
  }
  if (situacaoOk) {
    filtros.push(eq(prazos.situacao, situacaoOk));
  }
  if (diaOk) {
    filtros.push(eq(prazos.data, diaOk));
  }
  const itens = pronto
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
        .where(and(...filtros))
        .orderBy(
          asc(prazos.data),
          sql`case ${prazos.area} when 'administrativo' then 1 when 'civil' then 2 else 3 end`,
          asc(prazos.titulo),
          asc(prazos.id),
        )
        .limit(300)
    : [];
  const grupos = pronto
    ? await db
        .select({
          area: prazos.area,
          situacao: prazos.situacao,
          total: sql<number>`count(*)::int`,
        })
        .from(prazos)
        .where(doAdvogado)
        .groupBy(prazos.area, prazos.situacao)
    : [];
  const dias = pronto
    ? await db
        .select({
          data: prazos.data,
          total: sql<number>`count(*)::int`,
        })
        .from(prazos)
        .where(doAdvogado)
        .groupBy(prazos.data)
        .orderBy(asc(prazos.data))
    : [];
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
  const porArea = { administrativo: 0, civil: 0, trabalhista: 0 };
  let cumpridos = 0;
  let abertos = 0;
  let total = 0;
  for (const grupo of grupos) {
    porArea[grupo.area] += grupo.total;
    total += grupo.total;
    if (grupo.situacao === "cumprido") {
      cumpridos += grupo.total;
    } else {
      abertos += grupo.total;
    }
  }
  const recorte = { advogado: id, inicio: inicioOk, fim: fimOk };
  const filtrosVisiveis = [
    {
      rotulo: `Mostrar todos (${total})`,
      href: consultaRelatorio(recorte),
      ativo: !areaOk && !situacaoOk && !diaOk,
    },
    ...AREAS.map((item) => ({
      rotulo: `${rotuloArea(item)} (${porArea[item]})`,
      href: consultaRelatorio({ ...recorte, area: item }),
      ativo: areaOk === item && !situacaoOk && !diaOk,
    })),
    {
      rotulo: `Cumprido (${cumpridos})`,
      href: consultaRelatorio({ ...recorte, situacao: "cumprido" }),
      ativo: situacaoOk === "cumprido" && !areaOk && !diaOk,
    },
    {
      rotulo: `Não cumprido (${abertos})`,
      href: consultaRelatorio({ ...recorte, situacao: "aberto" }),
      ativo: situacaoOk === "aberto" && !areaOk && !diaOk,
    },
  ];
  const voltar = consultaRelatorio({
    ...recorte,
    area: areaOk,
    situacao: situacaoOk,
    data: diaOk || undefined,
  });

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
            defaultValue={inicioOk}
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
            defaultValue={fimOk}
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
      {pronto && escolhido ? (
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-ink">
            {`${escolhido.nome} ${escolhido.sobrenome}`.trim()} entre{" "}
            {dataBr(inicioOk)} e {dataBr(fimOk)}
          </h2>
          {dias.length > 0 ? (
            <nav
              aria-label="Dias do período"
              className="mt-6 flex flex-wrap gap-2"
            >
              {dias.map((dia) => (
                <Link
                  key={dia.data}
                  href={consultaRelatorio({ ...recorte, data: dia.data })}
                  aria-current={
                    dia.data === diaOk && !areaOk && !situacaoOk
                      ? "page"
                      : undefined
                  }
                  className={
                    dia.data === diaOk && !areaOk && !situacaoOk
                      ? "bg-pen px-3 py-2 text-lg font-semibold text-sheet"
                      : "border border-line bg-sheet px-3 py-2 text-lg text-ink"
                  }
                >
                  {dataBr(dia.data)} · {dia.total}
                </Link>
              ))}
            </nav>
          ) : null}
          <nav
            aria-label="Filtrar a lista"
            className="mt-6 flex flex-wrap gap-2"
          >
            {filtrosVisiveis.map((filtro) => (
              <Link
                key={filtro.rotulo}
                href={filtro.href}
                aria-current={filtro.ativo ? "page" : undefined}
                className={
                  filtro.ativo
                    ? "bg-pen px-3 py-2 text-lg font-semibold text-sheet"
                    : "border border-line bg-sheet px-3 py-2 text-lg text-ink"
                }
              >
                {filtro.rotulo}
              </Link>
            ))}
          </nav>
          <p className="mt-4">
            <Link
              href={`/admin/relatorios/impressao?advogado=${id}&inicio=${inicioOk}&fim=${fimOk}`}
              className="text-lg text-pen"
            >
              Imprimir o período
            </Link>
          </p>
          <p className="mt-3 text-xl text-muted">
            {itens.length === 300
              ? "Mostrando os 300 primeiros."
              : `${itens.length} nesta lista.`}
          </p>
          {itens.length === 0 ? (
            <p className="mt-6 text-xl text-ink">Nenhum prazo neste recorte.</p>
          ) : (
            <ul className="mt-6 divide-y divide-line border border-line bg-sheet">
              {itens.map((item) => (
                <li
                  key={item.id}
                  className={`px-6 py-5 ${faixaDaArea(item.area)}`}
                >
                  <p className="text-lg text-muted">
                    {rotuloArea(item.area)} · {dataBr(item.data)} ·{" "}
                    {statusDoPrazo({
                      situacao: item.situacao,
                      cumpridoPor: item.cumpridoNome
                        ? `${item.cumpridoNome} ${item.cumpridoSobrenome ?? ""}`.trim()
                        : null,
                      cumpridoEm: item.cumpridoEm,
                    })}
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold text-ink">
                    {item.titulo}
                  </h3>
                  <CorpoPrazo
                    temCorpo={
                      (advogados.get(item.id) ?? []).length > 0 ||
                      Boolean(item.observacao) ||
                      Boolean(item.conteudo)
                    }
                    corpo={
                      <>
                        {(advogados.get(item.id) ?? []).length > 0 ? (
                          <p className="mt-2 text-lg text-muted">
                            {(advogados.get(item.id) ?? []).join(", ")}
                          </p>
                        ) : null}
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
                      </>
                    }
                    acoes={
                      <>
                        <Link
                          href={`/prazos/impressao?id=${item.id}`}
                          className="border border-line bg-sheet px-4 py-2 text-lg font-semibold text-ink"
                        >
                          Imprimir
                        </Link>
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
                        ) : (
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
                        )}
                        <Link
                          href={`/admin/prazos/${item.id}`}
                          className="border border-line bg-sheet px-4 py-2 text-lg font-semibold text-ink"
                        >
                          Editar
                        </Link>
                        {item.situacao === "aberto" ? (
                          <BotaoExcluir
                            action={excluirPrazo}
                            pergunta="Excluir este prazo?"
                            rotulo="Excluir"
                          >
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="voltar" value={voltar} />
                          </BotaoExcluir>
                        ) : null}
                      </>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
