import { and, asc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import {
  cumprir,
  desfazer,
  excluirPrazo,
} from "@/app/(painel)/admin/prazos/actions";
import { BotaoExcluir } from "@/components/botao-excluir";
import { obterDb } from "@/db/client";
import { prazos, prazosUsuarios, usuarios } from "@/db/schema";
import { exigirUsuario } from "@/lib/acesso";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr } from "@/lib/datas";
import { rotuloArea } from "@/lib/resumo";

const AREAS = ["administrativo", "civil", "trabalhista"] as const;

function rotuloDia(iso: string) {
  const semana = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${iso}T12:00:00-03:00`));
  return `${semana} ${dataBr(iso).slice(0, 5)}`;
}

function consultaDaLista(base: {
  quando?: string;
  data?: string;
  area?: string;
  situacao?: string;
  meus?: boolean;
}) {
  const params = new URLSearchParams();
  if (base.quando === "hoje" || base.quando === "semana") {
    params.set("quando", base.quando);
  }
  if (base.data) {
    params.set("data", base.data);
  }
  if (base.area) {
    params.set("area", base.area);
  }
  if (base.situacao) {
    params.set("situacao", base.situacao);
  }
  if (base.meus) {
    params.set("meus", "1");
  }
  const texto = params.toString();
  return texto ? `/prazos?${texto}` : "/prazos";
}

export default function Prazos({
  searchParams,
}: {
  searchParams: Promise<{
    data?: string;
    quando?: string;
    excluido?: string;
    area?: string;
    situacao?: string;
    meus?: string;
  }>;
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
  searchParams: Promise<{
    data?: string;
    quando?: string;
    excluido?: string;
    area?: string;
    situacao?: string;
    meus?: string;
  }>;
}) {
  const { data, quando, excluido, area, situacao, meus } = await searchParams;
  const usuario = await exigirUsuario();
  const hoje = hojeNoEscritorio();
  const dataPedida = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : null;
  const areaOk = AREAS.find((item) => item === area);
  const situacaoOk =
    situacao === "aberto" || situacao === "cumprido" ? situacao : undefined;
  const soMeus = meus === "1";
  const recorte = {
    quando: quando === "hoje" || quando === "semana" ? quando : undefined,
    data: dataPedida ?? undefined,
  };
  const db = obterDb();
  const filtroData =
    quando === "hoje"
      ? eq(prazos.data, hoje)
      : quando === "semana"
        ? sql`extract(week from ${prazos.data}) = extract(week from ${hoje}::date) and extract(year from ${prazos.data}) = extract(year from ${hoje}::date)`
        : dataPedida
          ? eq(prazos.data, dataPedida)
          : sql`false`;
  const filtros = [filtroData];
  if (areaOk) {
    filtros.push(eq(prazos.area, areaOk));
  }
  if (situacaoOk) {
    filtros.push(eq(prazos.situacao, situacaoOk));
  }
  if (soMeus) {
    filtros.push(
      sql`exists (select 1 from prazos_usuarios where prazo_id = ${prazos.id} and usuario_id = ${usuario.id})`,
    );
  }

  const voltar = consultaDaLista({
    ...recorte,
    area: areaOk,
    situacao: situacaoOk,
    meus: soMeus,
  });

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
    .where(and(...filtros))
    .orderBy(asc(prazos.data), asc(prazos.titulo), asc(prazos.id))
    .limit(300);

  const ids = itens.map((item) => item.id);
  const vinculos =
    ids.length === 0
      ? []
      : await db
          .select({
            prazoId: prazosUsuarios.prazoId,
            usuarioId: prazosUsuarios.usuarioId,
            nome: usuarios.nome,
            sobrenome: usuarios.sobrenome,
          })
          .from(prazosUsuarios)
          .innerJoin(usuarios, eq(usuarios.id, prazosUsuarios.usuarioId))
          .where(inArray(prazosUsuarios.prazoId, ids))
          .orderBy(asc(usuarios.nome));
  const advogados = new Map<number, string[]>();
  const meusIds = new Set<number>();
  for (const vinculo of vinculos) {
    const lista = advogados.get(vinculo.prazoId) ?? [];
    lista.push(`${vinculo.nome} ${vinculo.sobrenome}`.trim());
    advogados.set(vinculo.prazoId, lista);
    if (vinculo.usuarioId === usuario.id) {
      meusIds.add(vinculo.prazoId);
    }
  }
  const diaImpressao = quando === "hoje" ? hoje : dataPedida;
  const ancora = dataPedida ?? hoje;
  const diasDaSemana =
    quando === "semana" || quando === "hoje" || dataPedida
      ? await db
          .select({
            data: prazos.data,
            total: sql<number>`count(*)::int`,
          })
          .from(prazos)
          .where(
            sql`extract(week from ${prazos.data}) = extract(week from ${ancora}::date) and extract(year from ${prazos.data}) = extract(year from ${ancora}::date)`,
          )
          .groupBy(prazos.data)
          .orderBy(asc(prazos.data))
      : [];
  const diaAberto = dataPedida ?? (quando === "hoje" ? hoje : "");
  const grupos = await db
    .select({
      area: prazos.area,
      situacao: prazos.situacao,
      total: sql<number>`count(*)::int`,
    })
    .from(prazos)
    .where(filtroData)
    .groupBy(prazos.area, prazos.situacao);
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
  const [meusConta] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(prazos)
    .where(
      and(
        filtroData,
        sql`exists (select 1 from prazos_usuarios where prazo_id = ${prazos.id} and usuario_id = ${usuario.id})`,
      ),
    );
  const meusTotal = meusConta?.total ?? 0;
  const filtrosVisiveis: Array<{
    rotulo: string;
    href: string;
    ativo: boolean;
  }> = [
    {
      rotulo: `Mostrar todos (${total})`,
      href: consultaDaLista(recorte),
      ativo: !areaOk && !situacaoOk && !soMeus,
    },
    ...AREAS.map((item) => ({
      rotulo: `${rotuloArea(item)} (${porArea[item]})`,
      href: consultaDaLista({ ...recorte, area: item }),
      ativo: areaOk === item && !situacaoOk && !soMeus,
    })),
    {
      rotulo: `Cumprido (${cumpridos})`,
      href: consultaDaLista({ ...recorte, situacao: "cumprido" }),
      ativo: situacaoOk === "cumprido" && !areaOk && !soMeus,
    },
    {
      rotulo: `Não cumprido (${abertos})`,
      href: consultaDaLista({ ...recorte, situacao: "aberto" }),
      ativo: situacaoOk === "aberto" && !areaOk && !soMeus,
    },
    {
      rotulo: `Meus prazos (${meusTotal})`,
      href: consultaDaLista({ ...recorte, meus: true }),
      ativo: soMeus && !areaOk && !situacaoOk,
    },
  ];

  return (
    <section className="mx-auto w-full max-w-5xl">
      <h1 className="text-4xl leading-tight font-bold text-ink">
        {tituloDaLista(quando, dataPedida ?? undefined)}
      </h1>
      {diasDaSemana.length > 0 ? (
        <nav aria-label="Dias da semana" className="mt-6 flex flex-wrap gap-2">
          {diasDaSemana.map((dia) => (
            <Link
              key={dia.data}
              href={`/prazos?data=${dia.data}`}
              aria-current={dia.data === diaAberto ? "page" : undefined}
              className={
                dia.data === diaAberto
                  ? "bg-pen px-3 py-2 text-lg font-semibold text-sheet"
                  : "border border-line bg-sheet px-3 py-2 text-lg text-ink"
              }
            >
              {rotuloDia(dia.data)} · {dia.total}
            </Link>
          ))}
        </nav>
      ) : null}
      <nav aria-label="Filtrar a lista" className="mt-6 flex flex-wrap gap-2">
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
      {diaImpressao ? (
        <p className="mt-4">
          <Link
            href={`/prazos/impressao?data=${diaImpressao}${areaOk ? `&area=${areaOk}` : ""}`}
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
                {rotuloArea(item.area)} ·{" "}
                {item.data.split("-").reverse().join("/")} ·{" "}
                {item.situacao === "cumprido" ? "Cumprido" : "Em aberto"}
                {meusIds.has(item.id) ? " · Seu prazo" : ""}
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-ink">
                {item.titulo}
              </h2>
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
              <div className="mt-4 flex flex-wrap gap-3">
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
