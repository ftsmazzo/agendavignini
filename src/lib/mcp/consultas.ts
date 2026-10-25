import { and, asc, desc, eq, gte, lt, lte, or, sql } from "drizzle-orm";
import { obterDb } from "@/db/client";
import {
  audiencias,
  audienciasUsuarios,
  contatos,
  prazos,
  prazosUsuarios,
  usuarios,
} from "@/db/schema";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataIsoValida, semanaDe } from "@/lib/datas";
import type { SessaoMcp } from "@/lib/mcp/auth";
import { numeroDoProcesso } from "@/lib/publicacao";
import { resumoDoDia } from "@/lib/resumo";

function cortar(texto: string, limite: number) {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo.length <= limite) {
    return limpo;
  }
  return `${limpo.slice(0, limite)}…`;
}

function limitar(
  valor: unknown,
  minimo: number,
  maximo: number,
  padrao: number,
) {
  const n = Number(valor);
  if (!Number.isFinite(n)) {
    return padrao;
  }
  return Math.min(maximo, Math.max(minimo, Math.trunc(n)));
}

function dataOuHoje(valor: unknown) {
  const texto = String(valor ?? "").trim();
  if (texto && dataIsoValida(texto)) {
    return texto;
  }
  return hojeNoEscritorio();
}

function usuarioFiltro(sessao: SessaoMcp, pedido: unknown) {
  if (sessao.perfil === "pessoal") {
    return sessao.usuarioId;
  }
  const n = Number(pedido);
  if (Number.isFinite(n) && n > 0) {
    return Math.trunc(n);
  }
  return null;
}

function like(termo: string) {
  return `%${termo.replace(/[%_\\]/g, "\\$&")}%`;
}

export async function contagemPainelMcp(params: Record<string, unknown>) {
  const data = dataOuHoje(params.data);
  const db = obterDb();
  const mesmaSemana = sql`extract(week from ${prazos.data}) = extract(week from ${data}::date) and extract(year from ${prazos.data}) = extract(year from ${data}::date)`;
  const instante = sql`(${audiencias.dataHora} at time zone 'America/Sao_Paulo')`;
  const semanaAud = sql`extract(week from ${instante}) = extract(week from ${data}::date) and extract(year from ${instante}) = extract(year from ${data}::date)`;

  const [dia] = await db
    .select({
      total: sql<number>`count(*)::int`,
      cumpridos: sql<number>`count(*) filter (where ${prazos.situacao} = 'cumprido')::int`,
    })
    .from(prazos)
    .where(eq(prazos.data, data));

  const [semana] = await db
    .select({
      total: sql<number>`count(*)::int`,
      cumpridos: sql<number>`count(*) filter (where ${prazos.situacao} = 'cumprido')::int`,
    })
    .from(prazos)
    .where(mesmaSemana);

  const [atraso] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(prazos)
    .where(and(eq(prazos.situacao, "aberto"), lt(prazos.data, data)));

  const [aud] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(audiencias)
    .where(semanaAud);

  return {
    data,
    prazos_hoje: dia?.total ?? 0,
    cumpridos_hoje: dia?.cumpridos ?? 0,
    prazos_semana: semana?.total ?? 0,
    cumpridos_semana: semana?.cumpridos ?? 0,
    em_atraso: atraso?.total ?? 0,
    audiencias_semana: aud?.total ?? 0,
  };
}

async function listarPrazos(opcoes: {
  sessao: SessaoMcp;
  inicio: string;
  fim: string;
  usuarioId: number | null;
  situacao?: "aberto" | "cumprido" | null;
  limite: number;
  soAtrasoAntesDe?: string;
}) {
  const db = obterDb();
  const filtros = [
    gte(prazos.data, opcoes.inicio),
    lte(prazos.data, opcoes.fim),
  ];
  if (opcoes.soAtrasoAntesDe) {
    filtros.length = 0;
    filtros.push(
      eq(prazos.situacao, "aberto"),
      lt(prazos.data, opcoes.soAtrasoAntesDe),
    );
  }
  if (opcoes.situacao) {
    filtros.push(eq(prazos.situacao, opcoes.situacao));
  }

  if (opcoes.usuarioId) {
    const linhas = await db
      .select({
        id: prazos.id,
        area: prazos.area,
        data: prazos.data,
        titulo: prazos.titulo,
        situacao: prazos.situacao,
        defesa: prazos.defesa,
        observacao: prazos.observacao,
        conteudo: prazos.conteudo,
      })
      .from(prazos)
      .innerJoin(prazosUsuarios, eq(prazosUsuarios.prazoId, prazos.id))
      .where(and(...filtros, eq(prazosUsuarios.usuarioId, opcoes.usuarioId)))
      .orderBy(asc(prazos.data), desc(prazos.id))
      .limit(opcoes.limite);
    return linhas.map(mapearPrazoLista);
  }

  const linhas = await db
    .select({
      id: prazos.id,
      area: prazos.area,
      data: prazos.data,
      titulo: prazos.titulo,
      situacao: prazos.situacao,
      defesa: prazos.defesa,
      observacao: prazos.observacao,
      conteudo: prazos.conteudo,
    })
    .from(prazos)
    .where(and(...filtros))
    .orderBy(asc(prazos.data), desc(prazos.id))
    .limit(opcoes.limite);
  return linhas.map(mapearPrazoLista);
}

function mapearPrazoLista(item: {
  id: number;
  area: "administrativo" | "civil" | "trabalhista";
  data: string;
  titulo: string;
  situacao: "aberto" | "cumprido";
  defesa: boolean;
  observacao: string;
  conteudo: string;
}) {
  return {
    id: item.id,
    area: item.area,
    data: item.data,
    titulo: item.titulo,
    situacao: item.situacao,
    defesa: item.defesa,
    processo: numeroDoProcesso(item.titulo, item.observacao, item.conteudo),
  };
}

export async function prazosHojeMcp(
  sessao: SessaoMcp,
  params: Record<string, unknown>,
) {
  const data = dataOuHoje(params.data);
  const situacao =
    params.situacao === "aberto" || params.situacao === "cumprido"
      ? params.situacao
      : null;
  const itens = await listarPrazos({
    sessao,
    inicio: data,
    fim: data,
    usuarioId: usuarioFiltro(sessao, params.usuario_id),
    situacao,
    limite: limitar(params.limite, 1, 80, 40),
  });
  return { data, total: itens.length, itens };
}

export async function prazosSemanaMcp(
  sessao: SessaoMcp,
  params: Record<string, unknown>,
) {
  const ancora = dataOuHoje(params.data);
  const { inicio, fim } = semanaDe(ancora);
  const itens = await listarPrazos({
    sessao,
    inicio,
    fim,
    usuarioId: usuarioFiltro(sessao, params.usuario_id),
    limite: limitar(params.limite, 1, 120, 60),
  });
  return { inicio, fim, total: itens.length, itens };
}

export async function prazosAtrasoMcp(
  sessao: SessaoMcp,
  params: Record<string, unknown>,
) {
  const data = dataOuHoje(params.data);
  const itens = await listarPrazos({
    sessao,
    inicio: "1900-01-01",
    fim: data,
    usuarioId: usuarioFiltro(sessao, params.usuario_id),
    limite: limitar(params.limite, 1, 100, 50),
    soAtrasoAntesDe: data,
  });
  return { data, total: itens.length, itens };
}

export async function prazoDetalheMcp(
  sessao: SessaoMcp,
  params: Record<string, unknown>,
) {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return { erro: "Informe o id do prazo." };
  }
  const db = obterDb();
  const [item] = await db
    .select({
      id: prazos.id,
      area: prazos.area,
      data: prazos.data,
      titulo: prazos.titulo,
      observacao: prazos.observacao,
      conteudo: prazos.conteudo,
      defesa: prazos.defesa,
      situacao: prazos.situacao,
      cumpridoPorId: prazos.cumpridoPorId,
      cumpridoEm: prazos.cumpridoEm,
      cumpridoNome: usuarios.nome,
      cumpridoSobrenome: usuarios.sobrenome,
    })
    .from(prazos)
    .leftJoin(usuarios, eq(usuarios.id, prazos.cumpridoPorId))
    .where(eq(prazos.id, Math.trunc(id)))
    .limit(1);

  if (!item) {
    return { erro: "Prazo não encontrado." };
  }

  if (sessao.perfil === "pessoal" && sessao.usuarioId) {
    const [vinculo] = await db
      .select({ prazoId: prazosUsuarios.prazoId })
      .from(prazosUsuarios)
      .where(
        and(
          eq(prazosUsuarios.prazoId, item.id),
          eq(prazosUsuarios.usuarioId, sessao.usuarioId),
        ),
      )
      .limit(1);
    if (!vinculo) {
      return { erro: "Este prazo não está vinculado ao dono do token." };
    }
  }

  const responsaveis = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      sobrenome: usuarios.sobrenome,
    })
    .from(prazosUsuarios)
    .innerJoin(usuarios, eq(usuarios.id, prazosUsuarios.usuarioId))
    .where(eq(prazosUsuarios.prazoId, item.id))
    .orderBy(asc(usuarios.nome));

  return {
    id: item.id,
    area: item.area,
    data: item.data,
    titulo: item.titulo,
    observacao: item.observacao,
    conteudo: cortar(item.conteudo, 6000),
    defesa: item.defesa,
    situacao: item.situacao,
    processo: numeroDoProcesso(item.titulo, item.observacao, item.conteudo),
    cumprido_por: item.cumpridoNome
      ? `${item.cumpridoNome} ${item.cumpridoSobrenome ?? ""}`.trim()
      : null,
    cumprido_em: item.cumpridoEm,
    responsaveis: responsaveis.map((pessoa) => ({
      id: pessoa.id,
      nome: `${pessoa.nome} ${pessoa.sobrenome}`.trim(),
    })),
  };
}

export async function buscarPublicacaoMcp(
  sessao: SessaoMcp,
  params: Record<string, unknown>,
) {
  const q = String(params.q ?? "")
    .replaceAll("\u0000", "")
    .trim()
    .slice(0, 120);
  if (q.length < 3) {
    return { erro: "Informe ao menos 3 caracteres em q." };
  }
  const padrao = like(q);
  const limite = limitar(params.limite, 1, 40, 20);
  const db = obterDb();
  const filtroTexto = or(
    sql`${prazos.titulo} ilike ${padrao}`,
    sql`${prazos.observacao} ilike ${padrao}`,
    sql`${prazos.conteudo} ilike ${padrao}`,
  );

  if (sessao.perfil === "pessoal" && sessao.usuarioId) {
    const linhas = await db
      .select({
        id: prazos.id,
        area: prazos.area,
        data: prazos.data,
        titulo: prazos.titulo,
        situacao: prazos.situacao,
        defesa: prazos.defesa,
        observacao: prazos.observacao,
        conteudo: prazos.conteudo,
      })
      .from(prazos)
      .innerJoin(prazosUsuarios, eq(prazosUsuarios.prazoId, prazos.id))
      .where(and(filtroTexto, eq(prazosUsuarios.usuarioId, sessao.usuarioId)))
      .orderBy(desc(prazos.data), desc(prazos.id))
      .limit(limite);
    return {
      q,
      total: linhas.length,
      itens: linhas.map((item) => ({
        ...mapearPrazoLista(item),
        trecho: cortar(item.conteudo || item.observacao || item.titulo, 280),
      })),
    };
  }

  const linhas = await db
    .select({
      id: prazos.id,
      area: prazos.area,
      data: prazos.data,
      titulo: prazos.titulo,
      situacao: prazos.situacao,
      defesa: prazos.defesa,
      observacao: prazos.observacao,
      conteudo: prazos.conteudo,
    })
    .from(prazos)
    .where(filtroTexto)
    .orderBy(desc(prazos.data), desc(prazos.id))
    .limit(limite);

  return {
    q,
    total: linhas.length,
    itens: linhas.map((item) => ({
      ...mapearPrazoLista(item),
      trecho: cortar(item.conteudo || item.observacao || item.titulo, 280),
    })),
  };
}

export async function prazosPorProcessoMcp(
  sessao: SessaoMcp,
  params: Record<string, unknown>,
) {
  const processo = String(params.processo ?? "")
    .replaceAll("\u0000", "")
    .trim()
    .slice(0, 80);
  if (processo.length < 4) {
    return { erro: "Informe o número do processo (ao menos 4 caracteres)." };
  }
  return buscarPublicacaoMcp(sessao, {
    q: processo,
    limite: params.limite ?? 20,
  });
}

async function listarAudiencias(opcoes: {
  sessao: SessaoMcp;
  inicio: string;
  fim: string;
  usuarioId: number | null;
  limite: number;
}) {
  const db = obterDb();
  const dia = sql`(${audiencias.dataHora} at time zone 'America/Sao_Paulo')::date`;
  const filtros = [
    sql`${dia} >= ${opcoes.inicio}::date`,
    sql`${dia} <= ${opcoes.fim}::date`,
  ];

  if (opcoes.usuarioId) {
    return db
      .select({
        id: audiencias.id,
        numeroProcesso: audiencias.numeroProcesso,
        vara: audiencias.vara,
        local: audiencias.local,
        reclamante: audiencias.reclamante,
        reclamado: audiencias.reclamado,
        dataHora: audiencias.dataHora,
        modalidade: audiencias.modalidade,
        ato: audiencias.ato,
        tipo: audiencias.tipo,
      })
      .from(audiencias)
      .innerJoin(
        audienciasUsuarios,
        eq(audienciasUsuarios.audienciaId, audiencias.id),
      )
      .where(
        and(...filtros, eq(audienciasUsuarios.usuarioId, opcoes.usuarioId)),
      )
      .orderBy(asc(audiencias.dataHora), asc(audiencias.id))
      .limit(opcoes.limite);
  }

  return db
    .select({
      id: audiencias.id,
      numeroProcesso: audiencias.numeroProcesso,
      vara: audiencias.vara,
      local: audiencias.local,
      reclamante: audiencias.reclamante,
      reclamado: audiencias.reclamado,
      dataHora: audiencias.dataHora,
      modalidade: audiencias.modalidade,
      ato: audiencias.ato,
      tipo: audiencias.tipo,
    })
    .from(audiencias)
    .where(and(...filtros))
    .orderBy(asc(audiencias.dataHora), asc(audiencias.id))
    .limit(opcoes.limite);
}

export async function audienciasHojeMcp(
  sessao: SessaoMcp,
  params: Record<string, unknown>,
) {
  const data = dataOuHoje(params.data);
  const itens = await listarAudiencias({
    sessao,
    inicio: data,
    fim: data,
    usuarioId: usuarioFiltro(sessao, params.usuario_id),
    limite: 80,
  });
  return { data, total: itens.length, itens };
}

export async function audienciasIntervaloMcp(
  sessao: SessaoMcp,
  params: Record<string, unknown>,
) {
  const inicio = String(params.inicio ?? "").trim();
  const fim = String(params.fim ?? "").trim();
  if (!dataIsoValida(inicio) || !dataIsoValida(fim)) {
    return { erro: "Informe inicio e fim em YYYY-MM-DD." };
  }
  if (inicio > fim) {
    return { erro: "A data inicial não pode ser depois da final." };
  }
  const itens = await listarAudiencias({
    sessao,
    inicio,
    fim,
    usuarioId: usuarioFiltro(sessao, params.usuario_id),
    limite: limitar(params.limite, 1, 80, 40),
  });
  return { inicio, fim, total: itens.length, itens };
}

export async function audienciaDetalheMcp(
  sessao: SessaoMcp,
  params: Record<string, unknown>,
) {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return { erro: "Informe o id da audiência." };
  }
  const db = obterDb();
  const [item] = await db
    .select()
    .from(audiencias)
    .where(eq(audiencias.id, Math.trunc(id)))
    .limit(1);
  if (!item) {
    return { erro: "Audiência não encontrada." };
  }
  if (sessao.perfil === "pessoal" && sessao.usuarioId) {
    const [vinculo] = await db
      .select({ id: audienciasUsuarios.audienciaId })
      .from(audienciasUsuarios)
      .where(
        and(
          eq(audienciasUsuarios.audienciaId, item.id),
          eq(audienciasUsuarios.usuarioId, sessao.usuarioId),
        ),
      )
      .limit(1);
    if (!vinculo) {
      return { erro: "Esta audiência não está vinculada ao dono do token." };
    }
  }
  return item;
}

export async function resumoDiaUsuarioMcp(
  sessao: SessaoMcp,
  params: Record<string, unknown>,
) {
  const data = dataOuHoje(params.data);
  const usuarioId = usuarioFiltro(sessao, params.usuario_id);
  if (!usuarioId && sessao.perfil === "escritorio") {
    return {
      erro: "No perfil escritório informe usuario_id para o resumo do dia.",
    };
  }
  if (!usuarioId) {
    return { erro: "Token pessoal sem usuário vinculado." };
  }
  const resumo = await resumoDoDia(usuarioId, data);
  return {
    usuario_id: usuarioId,
    data,
    audiencias: resumo.audiencias.map((item) => ({
      id: item.id,
      numero_processo: item.numeroProcesso,
      vara: item.vara,
      local: item.local,
      tipo: item.tipo,
      reclamante: item.reclamante,
      reclamado: item.reclamado,
      data_hora: item.dataHora,
    })),
    prazos: resumo.prazos.map((item) => ({
      id: item.id,
      area: item.area,
      data: item.data,
      titulo: item.titulo,
      situacao: item.situacao,
      conteudo: cortar(item.conteudo, 800),
      cumprido_por: item.cumpridoPor,
    })),
  };
}

function mascarar(valor: string | null | undefined) {
  const texto = (valor ?? "").trim();
  if (!texto) {
    return null;
  }
  if (texto.includes("@")) {
    const [user, dominio] = texto.split("@");
    if (!dominio) {
      return "***";
    }
    const inicio = user.slice(0, 2);
    return `${inicio}***@${dominio}`;
  }
  const digitos = texto.replace(/\D/g, "");
  if (digitos.length < 4) {
    return "***";
  }
  return `${digitos.slice(0, 2)}****${digitos.slice(-2)}`;
}

export async function contatosBuscarMcp(params: Record<string, unknown>) {
  const q = String(params.q ?? "")
    .replaceAll("\u0000", "")
    .trim()
    .slice(0, 80);
  if (q.length < 2) {
    return { erro: "Informe ao menos 2 caracteres em q." };
  }
  const db = obterDb();
  const padrao = like(q);
  const linhas = await db
    .select({
      id: contatos.id,
      nome: contatos.nome,
      telefone: contatos.telefone,
      celular: contatos.celular,
      email: contatos.email,
    })
    .from(contatos)
    .where(sql`${contatos.nome} ilike ${padrao}`)
    .orderBy(asc(contatos.nome))
    .limit(limitar(params.limite, 1, 30, 15));

  return {
    q,
    total: linhas.length,
    itens: linhas.map((item) => ({
      id: item.id,
      nome: item.nome,
      telefone: mascarar(item.telefone),
      celular: mascarar(item.celular),
      email: mascarar(item.email),
    })),
  };
}
