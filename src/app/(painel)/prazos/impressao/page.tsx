import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { BotaoImprimir } from "@/components/botao-imprimir";
import { FolhaPrazos, type LinhaFolha } from "@/components/folha-prazos";
import { obterDb } from "@/db/client";
import { prazos, prazosUsuarios, usuarios } from "@/db/schema";
import { exigirUsuario } from "@/lib/acesso";
import { dataBr, dataIsoValida, semanaDe } from "@/lib/datas";
import { rotuloArea, statusDoPrazo } from "@/lib/resumo";

const AREAS = ["administrativo", "civil", "trabalhista"] as const;

function idPedido(valor: string | undefined) {
  if (!valor || !/^\d{1,9}$/.test(valor)) {
    return null;
  }
  const numero = Number(valor);
  return numero > 0 ? numero : null;
}

export default function ImpressaoPrazos({
  searchParams,
}: {
  searchParams: Promise<{
    data?: string;
    area?: string;
    id?: string;
    semana?: string;
  }>;
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
  searchParams: Promise<{
    data?: string;
    area?: string;
    id?: string;
    semana?: string;
  }>;
}) {
  const { data, area, id, semana } = await searchParams;
  await exigirUsuario();
  const pedido = idPedido(id);
  const unico = id !== undefined;
  const dia = data && dataIsoValida(data) ? data : "";
  const recorte =
    !pedido && semana && dataIsoValida(semana) ? semanaDe(semana) : null;
  const tipo = AREAS.find((item) => item === area) ?? null;
  const db = obterDb();
  const filtro = pedido
    ? eq(prazos.id, pedido)
    : recorte
      ? and(
          gte(prazos.data, recorte.inicio),
          lte(prazos.data, recorte.fim),
          tipo ? eq(prazos.area, tipo) : undefined,
        )
      : dia
        ? and(eq(prazos.data, dia), tipo ? eq(prazos.area, tipo) : undefined)
        : undefined;
  const linhas = filtro
    ? await db
        .select({
          id: prazos.id,
          area: prazos.area,
          data: prazos.data,
          titulo: prazos.titulo,
          observacao: recorte ? sql<string>`''` : prazos.observacao,
          conteudo: recorte ? sql<string>`''` : prazos.conteudo,
          processo: sql<
            string | null
          >`substring((${prazos.titulo} || ' ' || ${prazos.observacao} || ' ' || ${prazos.conteudo}) from '[0-9]{7}-[0-9]{2}\\.[0-9]{4}\\.[0-9]\\.[0-9]{2}\\.[0-9]{4}')`,
          situacao: prazos.situacao,
          cumpridoNome: usuarios.nome,
          cumpridoSobrenome: usuarios.sobrenome,
          cumpridoEm: prazos.cumpridoEm,
        })
        .from(prazos)
        .leftJoin(usuarios, eq(usuarios.id, prazos.cumpridoPorId))
        .where(filtro)
        .orderBy(asc(prazos.data), desc(prazos.id))
        .limit(400)
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

  const diaVolta = unico ? (linhas[0]?.data ?? "") : dia;
  const baseFolha = recorte
    ? `/prazos/impressao?semana=${recorte.inicio}`
    : `/prazos/impressao?data=${dia}`;
  const titulo = unico
    ? (linhas[0]?.titulo ?? "Prazo não encontrado")
    : recorte
      ? `Prazos de ${dataBr(recorte.inicio)} a ${dataBr(recorte.fim)}`
      : dia
        ? `Prazos de ${dataBr(dia)}`
        : "Informe o dia";
  const folhas: LinhaFolha[] = linhas.map((item) => ({
    id: item.id,
    area: item.area,
    data: item.data,
    titulo: item.titulo,
    processo: item.processo ?? "",
    status: statusDoPrazo({
      situacao: item.situacao,
      cumpridoPor: item.cumpridoNome
        ? `${item.cumpridoNome} ${item.cumpridoSobrenome ?? ""}`.trim()
        : null,
      cumpridoEm: item.cumpridoEm,
    }),
    advogados: (advogados.get(item.id) ?? []).join(", "),
    observacao: item.observacao,
    conteudo: item.conteudo,
    situacao: item.situacao,
    compacta: Boolean(recorte),
  }));

  return (
    <section className="folha-prazo mx-auto w-full max-w-4xl">
      <div className="nao-imprimir flex flex-wrap items-center gap-3">
        <BotaoImprimir />
        <Link
          href={
            recorte
              ? `/prazos?quando=semana&data=${recorte.inicio}`
              : diaVolta
                ? `/prazos?data=${diaVolta}`
                : "/prazos"
          }
          className="text-lg text-pen"
        >
          Voltar
        </Link>
        {unico
          ? null
          : AREAS.map((item) => (
              <Link
                key={item}
                href={`${baseFolha}&area=${item}`}
                className="text-lg text-pen"
              >
                {rotuloArea(item)}
              </Link>
            ))}
        {!unico && tipo ? (
          <Link href={baseFolha} className="text-lg text-pen">
            Todas as áreas
          </Link>
        ) : null}
      </div>
      <h1 className="mt-6 text-4xl leading-tight font-bold text-ink">
        {titulo}
      </h1>
      {linhas.length === 400 ? (
        <p className="mt-2 text-lg text-ink">Mostrando os 400 primeiros.</p>
      ) : null}
      {linhas.length === 0 ? (
        <p className="mt-8 text-xl text-ink">Nenhum prazo nesta folha.</p>
      ) : (
        <FolhaPrazos itens={folhas} agrupado={Boolean(recorte)} />
      )}
    </section>
  );
}
