import { and, desc, gte, lte, or, sql } from "drizzle-orm";
import { obterDb } from "@/db/client";
import { audiencias, prazos } from "@/db/schema";
import { fimDoMes } from "@/lib/calendario";
import { dataBr, dataIsoValida } from "@/lib/datas";

const PARADAS = new Set([
  "prazo",
  "prazos",
  "audiencia",
  "audiencias",
  "cliente",
  "clientes",
  "ato",
  "atos",
  "carteira",
  "escritorio",
  "quais",
  "qual",
  "quem",
  "como",
  "onde",
  "quando",
  "sobre",
  "para",
  "por",
  "com",
  "sem",
  "que",
  "uma",
  "uns",
  "umas",
  "dos",
  "das",
  "nos",
  "nas",
  "pelo",
  "pela",
  "esta",
  "esse",
  "essa",
  "este",
  "isto",
  "isso",
  "hoje",
  "semana",
  "passada",
  "proxima",
  "mostrar",
  "listar",
  "lista",
  "dizer",
  "diga",
  "tem",
  "ter",
  "foi",
  "sao",
  "entre",
  "ate",
  "the",
]);

const MESES: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

type CitacaoPrazo = {
  id: number;
  area: "administrativo" | "civil" | "trabalhista";
  data: string;
  titulo: string;
  situacao: "aberto" | "cumprido";
  trecho: string;
};

type CitacaoAudiencia = {
  id: number;
  numeroProcesso: string;
  dataHora: Date;
  vara: string;
  reclamante: string | null;
  reclamado: string | null;
  trecho: string;
};

export type RespostaCarteira = {
  recorte: string | null;
  termos: string[];
  prazos: CitacaoPrazo[];
  audiencias: CitacaoAudiencia[];
};

type Intervalo = { inicio: string; fim: string; rotulo: string };

function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function somarDias(iso: string, dias: number) {
  const ano = Number(iso.slice(0, 4));
  const mes = Number(iso.slice(5, 7));
  const dia = Number(iso.slice(8, 10));
  const data = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return data.toISOString().slice(0, 10);
}

function inicioDaSemana(iso: string) {
  const ano = Number(iso.slice(0, 4));
  const mes = Number(iso.slice(5, 7));
  const dia = Number(iso.slice(8, 10));
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const distancia = data.getUTCDay() === 0 ? 6 : data.getUTCDay() - 1;
  return somarDias(iso, -distancia);
}

function padrao(termo: string) {
  return `%${termo.replace(/[\\%_]/g, (caractere) => `\\${caractere}`)}%`;
}

function lerIntervalo(pergunta: string, hoje: string): Intervalo | null {
  const texto = semAcento(pergunta);
  const data = texto.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (data) {
    const iso = `${data[3]}-${data[2].padStart(2, "0")}-${data[1].padStart(2, "0")}`;
    if (dataIsoValida(iso)) {
      return { inicio: iso, fim: iso, rotulo: dataBr(iso) };
    }
  }
  if (/\bsemana passada\b/.test(texto)) {
    const inicio = somarDias(inicioDaSemana(hoje), -7);
    return {
      inicio,
      fim: somarDias(inicio, 6),
      rotulo: "na semana passada",
    };
  }
  if (/\bproxima semana\b/.test(texto)) {
    const inicio = somarDias(inicioDaSemana(hoje), 7);
    return {
      inicio,
      fim: somarDias(inicio, 6),
      rotulo: "na próxima semana",
    };
  }
  if (/\b(esta|essa) semana\b/.test(texto) || /\bsemana\b/.test(texto)) {
    const inicio = inicioDaSemana(hoje);
    return { inicio, fim: somarDias(inicio, 6), rotulo: "nesta semana" };
  }
  const mes = Object.keys(MESES).find((nome) =>
    new RegExp(`\\b${nome}\\b`).test(texto),
  );
  if (mes) {
    const anoTexto = texto.match(/\b(20\d{2})\b/);
    const ano = anoTexto ? Number(anoTexto[1]) : Number(hoje.slice(0, 4));
    const numero = MESES[mes] ?? 1;
    const inicio = `${ano}-${String(numero).padStart(2, "0")}-01`;
    const rotulos = [
      "janeiro",
      "fevereiro",
      "março",
      "abril",
      "maio",
      "junho",
      "julho",
      "agosto",
      "setembro",
      "outubro",
      "novembro",
      "dezembro",
    ];
    return {
      inicio,
      fim: fimDoMes(ano, numero),
      rotulo: `em ${rotulos[numero - 1]} de ${ano}`,
    };
  }
  if (/\bhoje\b/.test(texto)) {
    return { inicio: hoje, fim: hoje, rotulo: "hoje" };
  }
  return null;
}

function lerTermos(pergunta: string) {
  const texto = semAcento(pergunta);
  const palavras = texto.match(/[a-z0-9][a-z0-9.-]{1,40}/g) ?? [];
  const termos: string[] = [];
  for (const palavra of palavras) {
    if (PARADAS.has(palavra) || MESES[palavra]) {
      continue;
    }
    if (/^\d{1,3}$/.test(palavra)) {
      continue;
    }
    if (palavra.length < 3) {
      continue;
    }
    if (!termos.includes(palavra)) {
      termos.push(palavra);
    }
  }
  return termos.slice(0, 5);
}

function trechoDe(coluna: unknown, termo: string) {
  return sql<string>`case
    when position(lower(${termo}) in lower(${coluna})) > 0
    then substring(${coluna} from greatest(position(lower(${termo}) in lower(${coluna})) - 80, 1) for 220)
    else ''
  end`;
}

function escolherTrecho(partes: string[], termo: string) {
  const alvo = semAcento(termo);
  for (const parte of partes) {
    const limpo = parte.replace(/\s+/g, " ").trim();
    if (limpo && semAcento(limpo).includes(alvo)) {
      return limpo.length > 180 ? `${limpo.slice(0, 180).trim()}…` : limpo;
    }
  }
  const reserva = partes.find((parte) => parte.trim()) ?? "";
  const limpo = reserva.replace(/\s+/g, " ").trim();
  if (!limpo) {
    return "";
  }
  return limpo.length > 180 ? `${limpo.slice(0, 180).trim()}…` : limpo;
}

export async function responderCarteira(
  pergunta: string,
  hoje: string,
): Promise<RespostaCarteira> {
  const intervalo = lerIntervalo(pergunta, hoje);
  const termos = lerTermos(pergunta);
  if (!intervalo && termos.length === 0) {
    return { recorte: null, termos: [], prazos: [], audiencias: [] };
  }

  const db = obterDb();
  const termo = termos[0] ?? "";
  const filtrosPrazo = [];
  if (intervalo) {
    filtrosPrazo.push(
      gte(prazos.data, intervalo.inicio),
      lte(prazos.data, intervalo.fim),
    );
  }
  for (const item of termos) {
    const like = padrao(item);
    filtrosPrazo.push(
      or(
        sql`${prazos.titulo} ilike ${like}`,
        sql`${prazos.observacao} ilike ${like}`,
        sql`${prazos.conteudo} ilike ${like}`,
      ),
    );
  }

  const linhasPrazo = await db
    .select({
      id: prazos.id,
      area: prazos.area,
      data: prazos.data,
      titulo: prazos.titulo,
      situacao: prazos.situacao,
      trechoTitulo: termo ? trechoDe(prazos.titulo, termo) : sql<string>`''`,
      trechoObservacao: termo
        ? trechoDe(prazos.observacao, termo)
        : sql<string>`left(${prazos.observacao}, 180)`,
      trechoConteudo: termo
        ? trechoDe(prazos.conteudo, termo)
        : sql<string>`left(${prazos.conteudo}, 180)`,
    })
    .from(prazos)
    .where(and(...filtrosPrazo))
    .orderBy(desc(prazos.data), desc(prazos.id))
    .limit(20);

  const diaAudiencia = sql`(${audiencias.dataHora} at time zone 'America/Sao_Paulo')::date`;
  const filtrosAudiencia = [];
  if (intervalo) {
    filtrosAudiencia.push(
      sql`${diaAudiencia} >= ${intervalo.inicio}::date`,
      sql`${diaAudiencia} <= ${intervalo.fim}::date`,
    );
  }
  for (const item of termos) {
    const like = padrao(item);
    filtrosAudiencia.push(
      or(
        sql`${audiencias.numeroProcesso} ilike ${like}`,
        sql`${audiencias.vara} ilike ${like}`,
        sql`${audiencias.local} ilike ${like}`,
        sql`${audiencias.reclamante} ilike ${like}`,
        sql`${audiencias.reclamado} ilike ${like}`,
        sql`${audiencias.preposto} ilike ${like}`,
        sql`${audiencias.observacao} ilike ${like}`,
      ),
    );
  }

  const linhasAudiencia = await db
    .select({
      id: audiencias.id,
      numeroProcesso: audiencias.numeroProcesso,
      dataHora: audiencias.dataHora,
      vara: audiencias.vara,
      reclamante: audiencias.reclamante,
      reclamado: audiencias.reclamado,
      trecho: termo
        ? trechoDe(audiencias.observacao, termo)
        : sql<string>`left(${audiencias.observacao}, 180)`,
    })
    .from(audiencias)
    .where(and(...filtrosAudiencia))
    .orderBy(desc(audiencias.dataHora), desc(audiencias.id))
    .limit(10);

  return {
    recorte: intervalo?.rotulo ?? null,
    termos,
    prazos: linhasPrazo.map((linha) => ({
      id: linha.id,
      area: linha.area,
      data: linha.data,
      titulo: linha.titulo,
      situacao: linha.situacao,
      trecho: escolherTrecho(
        [linha.trechoTitulo, linha.trechoObservacao, linha.trechoConteudo],
        termo,
      ),
    })),
    audiencias: linhasAudiencia.map((linha) => ({
      id: linha.id,
      numeroProcesso: linha.numeroProcesso,
      dataHora: linha.dataHora,
      vara: linha.vara,
      reclamante: linha.reclamante,
      reclamado: linha.reclamado,
      trecho: linha.trecho.replace(/\s+/g, " ").trim(),
    })),
  };
}
