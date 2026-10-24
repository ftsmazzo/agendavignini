import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import {
  cumprir,
  desfazer,
  excluirPrazo,
} from "@/app/(painel)/admin/prazos/actions";
import { BotaoCumprir } from "@/components/botao-cumprir";
import { BotaoExcluir } from "@/components/botao-excluir";
import { CorpoPrazo } from "@/components/corpo-prazo";
import { MarcarAdvogado } from "@/components/marcar-advogado";
import { ProcessoPrazo } from "@/components/processo-prazo";
import { obterDb } from "@/db/client";
import { prazos, prazosUsuarios, usuarios } from "@/db/schema";
import { exigirUsuario } from "@/lib/acesso";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr, semanaDe, somarDias } from "@/lib/datas";
import { listarPessoas } from "@/lib/pessoas";
import { numeroDoProcesso } from "@/lib/publicacao";
import {
  faixaDaArea,
  filtroDefesa,
  prazoEhDefesa,
  rotuloArea,
  statusDoPrazo,
} from "@/lib/resumo";

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
  advogado?: string;
  defesa?: boolean;
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
  if (base.advogado === "0" || /^\d+$/.test(base.advogado ?? "")) {
    params.set("advogado", base.advogado ?? "");
  }
  if (base.defesa) {
    params.set("defesa", "1");
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
    advogado?: string;
    repetidos?: string;
  }>;
}) {
  return (
    <Suspense fallback={<p className="text-muted">Abrindo os prazos.</p>}>
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
    advogado?: string;
    defesa?: string;
    repetidos?: string;
  }>;
}) {
  const {
    data,
    quando,
    excluido,
    area,
    situacao,
    meus,
    advogado,
    defesa,
    repetidos,
  } = await searchParams;
  const usuario = await exigirUsuario();
  const hoje = hojeNoEscritorio();
  const dataPedida = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : null;
  const areaOk = AREAS.find((item) => item === area);
  const situacaoOk =
    situacao === "aberto" || situacao === "cumprido" ? situacao : undefined;
  const soMeus = meus === "1";
  const soDefesas = defesa === "1";
  const pessoas = (await listarPessoas()).filter((pessoa) => pessoa.ativo);
  const advogadoNumero = Number(advogado);
  const advogadoFiltro =
    advogado === "0"
      ? "0"
      : pessoas.some((pessoa) => pessoa.id === advogadoNumero)
        ? String(advogadoNumero)
        : undefined;
  const recorte = {
    quando: quando === "hoje" || quando === "semana" ? quando : undefined,
    data: dataPedida ?? undefined,
    advogado: advogadoFiltro,
  };
  const db = obterDb();
  const ancoraSemana = dataPedida ?? hoje;
  const semana = quando === "semana" ? semanaDe(ancoraSemana) : null;
  const filtroData =
    quando === "hoje"
      ? eq(prazos.data, hoje)
      : quando === "semana"
        ? sql`extract(week from ${prazos.data}) = extract(week from ${ancoraSemana}::date) and extract(year from ${prazos.data}) = extract(year from ${ancoraSemana}::date)`
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
  if (soDefesas) {
    filtros.push(filtroDefesa());
  }
  if (advogadoFiltro === "0") {
    filtros.push(
      sql`not exists (select 1 from prazos_usuarios where prazo_id = ${prazos.id})`,
    );
  } else if (advogadoFiltro) {
    filtros.push(
      sql`exists (select 1 from prazos_usuarios where prazo_id = ${prazos.id} and usuario_id = ${Number(advogadoFiltro)})`,
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
      defesa: prazos.defesa,
      situacao: prazos.situacao,
      cumpridoNome: usuarios.nome,
      cumpridoSobrenome: usuarios.sobrenome,
      cumpridoEm: prazos.cumpridoEm,
    })
    .from(prazos)
    .leftJoin(usuarios, eq(usuarios.id, prazos.cumpridoPorId))
    .where(and(...filtros))
    .orderBy(asc(prazos.data), desc(prazos.id))
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
  const ancora = quando === "semana" ? ancoraSemana : (dataPedida ?? hoje);
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
  const [defesasConta] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(prazos)
    .where(and(filtroData, filtroDefesa()));
  const defesasTotal = defesasConta?.total ?? 0;
  const filtrosVisiveis: Array<{
    rotulo: string;
    href: string;
    ativo: boolean;
  }> = [
    {
      rotulo: `Mostrar todos (${total})`,
      href: consultaDaLista(recorte),
      ativo: !areaOk && !situacaoOk && !soMeus && !soDefesas,
    },
    ...AREAS.map((item) => ({
      rotulo: `${rotuloArea(item)} (${porArea[item]})`,
      href: consultaDaLista({ ...recorte, area: item }),
      ativo: areaOk === item && !situacaoOk && !soMeus && !soDefesas,
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
    <section className="entrada mx-auto w-full max-w-5xl">
      <h1 className="titulo-pagina">
        {tituloDaLista(quando, dataPedida ?? undefined)}
      </h1>
      <p className="subtitulo-pagina">
        {semana ? `${dataBr(semana.inicio)} a ${dataBr(semana.fim)}. ` : ""}
        {itens.length === 300
          ? "Mostrando os 300 primeiros."
          : `${itens.length} nesta lista.`}
      </p>
      {quando !== "semana" ? (
        <nav aria-label="Aba do dia" className="mt-6 flex flex-wrap gap-2">
          <Link
            href={consultaDaLista(recorte)}
            aria-current={soDefesas ? undefined : "page"}
            className="chip"
          >
            Prazos do dia
          </Link>
          <Link
            href={consultaDaLista({ ...recorte, defesa: true })}
            aria-current={soDefesas ? "page" : undefined}
            className="chip"
          >
            Defesas
            <span className="selo">{defesasTotal}</span>
          </Link>
        </nav>
      ) : null}
      {semana ? (
        <nav
          aria-label="Outras semanas"
          className="mt-6 flex flex-wrap items-center gap-2"
        >
          <Link
            href={consultaDaLista({
              quando: "semana",
              data: somarDias(semana.inicio, -7),
              area: areaOk,
              situacao: situacaoOk,
              meus: soMeus,
              advogado: advogadoFiltro,
            })}
            className="chip"
          >
            Semana anterior
          </Link>
          <Link
            href={consultaDaLista({
              quando: "semana",
              area: areaOk,
              situacao: situacaoOk,
              meus: soMeus,
              advogado: advogadoFiltro,
            })}
            aria-current={
              semana.inicio === semanaDe(hoje).inicio ? "page" : undefined
            }
            className="chip"
          >
            Esta semana
          </Link>
          <Link
            href={consultaDaLista({
              quando: "semana",
              data: somarDias(semana.inicio, 7),
              area: areaOk,
              situacao: situacaoOk,
              meus: soMeus,
              advogado: advogadoFiltro,
            })}
            className="chip"
          >
            Próxima semana
          </Link>
          <Link
            href={`/prazos/impressao?semana=${semana.inicio}${areaOk ? `&area=${areaOk}` : ""}`}
            className="btn btn-pequeno"
          >
            Imprimir a semana
          </Link>
        </nav>
      ) : null}
      {diasDaSemana.length > 0 ? (
        <nav aria-label="Dias da semana" className="mt-6 flex flex-wrap gap-2">
          {diasDaSemana.map((dia) => (
            <Link
              key={dia.data}
              href={consultaDaLista({
                data: dia.data,
                advogado: advogadoFiltro,
              })}
              aria-current={dia.data === diaAberto ? "page" : undefined}
              className="chip"
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
            className="chip"
          >
            {filtro.rotulo}
          </Link>
        ))}
      </nav>
      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        {recorte.quando ? (
          <input type="hidden" name="quando" value={recorte.quando} />
        ) : null}
        {recorte.data ? (
          <input type="hidden" name="data" value={recorte.data} />
        ) : null}
        {areaOk ? <input type="hidden" name="area" value={areaOk} /> : null}
        {situacaoOk ? (
          <input type="hidden" name="situacao" value={situacaoOk} />
        ) : null}
        {soMeus ? <input type="hidden" name="meus" value="1" /> : null}
        <div>
          <label htmlFor="advogado" className="mb-2 block text-lg text-ink">
            Advogado
          </label>
          <select
            id="advogado"
            name="advogado"
            defaultValue={advogadoFiltro ?? ""}
            className="campo"
          >
            <option value="">Todos</option>
            <option value="0">Sem advogado marcado</option>
            {pessoas.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.nome}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primario">
          Filtrar
        </button>
      </form>
      {diaImpressao ? (
        <p className="mt-5 flex flex-wrap items-center gap-2">
          <Link
            href={`/prazos/cumprir?dia=${diaImpressao}`}
            className="btn btn-primario btn-pequeno"
          >
            Cumprir os em aberto
          </Link>
          {usuario.papel === "admin" ? (
            <Link
              href={`/admin/prazos/adiar?dia=${diaImpressao}`}
              className="btn btn-pequeno"
            >
              Adiar os em aberto
            </Link>
          ) : null}
          {quando !== "semana" ? (
            <Link
              href={consultaDaLista({
                quando: "semana",
                data: diaImpressao,
                advogado: advogadoFiltro,
              })}
              className="btn btn-pequeno"
            >
              Ver a semana
            </Link>
          ) : null}
          <Link
            href={`/prazos/impressao?data=${diaImpressao}${areaOk ? `&area=${areaOk}` : ""}`}
            className="btn btn-pequeno"
          >
            Imprimir este dia
          </Link>
          {AREAS.map((item) => (
            <Link
              key={item}
              href={`/prazos/impressao?data=${diaImpressao}&area=${item}`}
              className="btn-texto px-2 text-[0.9375rem]"
            >
              {rotuloArea(item)}
            </Link>
          ))}
        </p>
      ) : null}
      {excluido ? (
        <output className="aviso aviso-ok mt-4 block">Prazo excluído.</output>
      ) : null}
      {/^\d{1,3}$/.test(repetidos ?? "") && Number(repetidos) > 1 ? (
        <output className="aviso aviso-ok mt-4 block">
          {`${repetidos} prazos foram gravados a partir de ${dataBr(dataPedida ?? hoje)}.`}
        </output>
      ) : null}
      {itens.length === 0 ? (
        <p className="vazio mt-8">
          {soDefesas
            ? "Nenhuma defesa neste dia. Vale a classificação Defesa, ou a palavra defesa no título."
            : "Nenhum prazo neste recorte."}
        </p>
      ) : quando === "semana" ? (
        <div className="mt-8 space-y-8">
          {[...new Set(itens.map((item) => item.data))].map((dataDia) => (
            <section key={dataDia}>
              <h2 className="titulo-secao">
                <Link href={`/prazos?data=${dataDia}`} className="btn-texto">
                  {rotuloDia(dataDia)} ·{" "}
                  {itens.filter((item) => item.data === dataDia).length}
                </Link>
              </h2>
              <ul className="lista-cartoes mt-3">
                {itens
                  .filter((item) => item.data === dataDia)
                  .map((item) => (
                    <li
                      key={item.id}
                      className={`px-4 py-3 ${faixaDaArea(item.area, item.situacao, prazoEhDefesa(item.defesa, item.titulo))}`}
                    >
                      <CartaoPrazo
                        item={item}
                        advogados={advogados.get(item.id) ?? []}
                        seu={meusIds.has(item.id)}
                        voltar={voltar}
                        admin={usuario.papel === "admin"}
                        pessoas={pessoas}
                        inteiro={quando !== "semana"}
                      />
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="lista-cartoes mt-8">
          {itens.map((item) => (
            <li
              key={item.id}
              className={`px-4 py-3 ${faixaDaArea(item.area, item.situacao, prazoEhDefesa(item.defesa, item.titulo))}`}
            >
              <CartaoPrazo
                item={item}
                advogados={advogados.get(item.id) ?? []}
                seu={meusIds.has(item.id)}
                voltar={voltar}
                admin={usuario.papel === "admin"}
                pessoas={pessoas}
                inteiro
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function textoEncaixado(texto: string) {
  return texto
    .replace(/[^\S\n]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function CartaoPrazo({
  item,
  advogados,
  seu,
  voltar,
  admin,
  pessoas,
  inteiro,
}: {
  item: {
    id: number;
    area: "administrativo" | "civil" | "trabalhista";
    data: string;
    titulo: string;
    observacao: string;
    conteudo: string;
    defesa: boolean;
    situacao: "aberto" | "cumprido";
    cumpridoNome: string | null;
    cumpridoSobrenome: string | null;
    cumpridoEm: Date | null;
  };
  advogados: string[];
  seu: boolean;
  voltar: string;
  admin: boolean;
  pessoas: Array<{ id: number; nome: string }>;
  inteiro: boolean;
}) {
  return (
    <>
      <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        <span className="selo">{rotuloArea(item.area)}</span>
        <span>{dataBr(item.data)}</span>
        <span
          className={`selo ${item.situacao === "cumprido" ? "selo-ok" : "selo-neutro"}`}
        >
          {statusDoPrazo({
            situacao: item.situacao,
            cumpridoPor: item.cumpridoNome
              ? `${item.cumpridoNome} ${item.cumpridoSobrenome ?? ""}`.trim()
              : null,
            cumpridoEm: item.cumpridoEm,
          })}
        </span>
        {seu ? <span className="selo selo-audiencia">Seu prazo</span> : null}
        {prazoEhDefesa(item.defesa, item.titulo) ? (
          <span className="selo">Defesa</span>
        ) : null}
      </p>
      <h3 className="mt-1 text-base leading-tight font-semibold text-ink">
        {item.titulo}
      </h3>
      <ProcessoPrazo
        numero={numeroDoProcesso(item.titulo, item.observacao, item.conteudo)}
      />
      <CorpoPrazo
        temCorpo={
          advogados.length > 0 ||
          Boolean(item.observacao) ||
          Boolean(item.conteudo)
        }
        corpo={
          <>
            {advogados.length > 0 ? (
              <p className="mt-1 text-sm leading-snug text-muted">
                {advogados.join(", ")}
              </p>
            ) : null}
            {item.observacao ? (
              <p className="mt-1.5 text-sm leading-snug whitespace-pre-line text-ink">
                {textoEncaixado(item.observacao)}
              </p>
            ) : null}
            {item.conteudo && inteiro ? (
              <p className="mt-1.5 text-sm leading-snug whitespace-pre-line text-ink">
                {textoEncaixado(item.conteudo)}
              </p>
            ) : item.conteudo ? (
              <details className="mt-1.5">
                <summary className="btn-texto cursor-pointer">
                  Ver publicação
                </summary>
                <p className="mt-1.5 rounded-lg bg-paper p-3 text-sm leading-snug whitespace-pre-line text-ink">
                  {textoEncaixado(item.conteudo)}
                </p>
              </details>
            ) : null}
          </>
        }
        acoes={
          <>
            <Link
              href={`/prazos/impressao?id=${item.id}`}
              className="btn btn-pequeno"
            >
              Imprimir
            </Link>
            {admin && item.situacao === "aberto" && advogados.length === 0 ? (
              <MarcarAdvogado
                prazoId={item.id}
                voltar={voltar}
                pessoas={pessoas}
              />
            ) : null}
            {item.situacao === "aberto" ? (
              <BotaoCumprir action={cumprir}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="voltar" value={voltar} />
              </BotaoCumprir>
            ) : null}
            {admin && item.situacao === "cumprido" ? (
              <form action={desfazer}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="voltar" value={voltar} />
                <button type="submit" className="btn btn-pequeno">
                  Desfazer
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
          </>
        }
      />
    </>
  );
}
