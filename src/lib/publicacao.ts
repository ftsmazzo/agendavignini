import { dataBr, dataIsoValida, ehFimDeSemana } from "@/lib/datas";

type AreaSugerida = "administrativo" | "civil" | "trabalhista";

export type SugestaoPublicacao = {
  area: AreaSugerida | null;
  data: string | null;
  titulo: string | null;
  observacao: string | null;
  conteudo: string;
  advogados: number[];
  avisos: string[];
};

const PROCESSO = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;

const ATOS: Array<{ padrao: RegExp; titulo: string }> = [
  { padrao: /carta de preposi[cç][aã]o/i, titulo: "PRAZO CARTA DE PREPOSIÇÃO" },
  { padrao: /quesitos/i, titulo: "PRAZO QUESITOS" },
  { padrao: /impugna/i, titulo: "PRAZO IMPUGNAÇÃO" },
  { padrao: /raz[oõ]es finais/i, titulo: "PRAZO RAZÕES FINAIS" },
  { padrao: /agravo de instrumento/i, titulo: "PRAZO AGRAVO DE INSTRUMENTO" },
  { padrao: /agravo/i, titulo: "PRAZO AGRAVO" },
  { padrao: /contesta/i, titulo: "PRAZO CONTESTAÇÃO" },
  { padrao: /embargos/i, titulo: "PRAZO EMBARGOS" },
  { padrao: /recurso/i, titulo: "PRAZO RECURSO" },
  { padrao: /manifesta/i, titulo: "PRAZO MANIFESTAÇÃO" },
  { padrao: /documentos/i, titulo: "ACOMPANHAR SOLICITAÇÃO DE DOCUMENTOS" },
  { padrao: /audi[eê]ncia/i, titulo: "ACOMPANHAR AUDIÊNCIA" },
];

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

function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isoUtc(ano: number, mes: number, dia: number) {
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    return null;
  }
  const mesTexto = String(mes).padStart(2, "0");
  const diaTexto = String(dia).padStart(2, "0");
  return `${ano}-${mesTexto}-${diaTexto}`;
}

function somarDias(iso: string, dias: number) {
  const ano = Number(iso.slice(0, 4));
  const mes = Number(iso.slice(5, 7));
  const dia = Number(iso.slice(8, 10));
  const data = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return data.toISOString().slice(0, 10);
}

function pascoa(ano: number) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return isoUtc(ano, mes, dia) ?? `${ano}-04-01`;
}

function feriados(ano: number) {
  const lista = new Set(
    [
      "01-01",
      "04-21",
      "05-01",
      "09-07",
      "10-12",
      "11-02",
      "11-15",
      "12-25",
    ].map((dia) => `${ano}-${dia}`),
  );
  const domingo = pascoa(ano);
  lista.add(somarDias(domingo, -48));
  lista.add(somarDias(domingo, -47));
  lista.add(somarDias(domingo, -2));
  lista.add(somarDias(domingo, 60));
  return lista;
}

function ehUtil(iso: string) {
  return !ehFimDeSemana(iso) && !feriados(Number(iso.slice(0, 4))).has(iso);
}

export function ehDiaUtil(iso: string) {
  return dataIsoValida(iso) && ehUtil(iso);
}

export function diaUtilSeguinte(iso: string) {
  let cursor = somarDias(iso, 1);
  while (!ehUtil(cursor)) {
    cursor = somarDias(cursor, 1);
  }
  return cursor;
}

export function numeroDoProcesso(...trechos: Array<string | null | undefined>) {
  for (const trecho of trechos) {
    const achado = trecho?.match(PROCESSO)?.[0];
    if (achado) {
      return achado;
    }
  }
  return null;
}

export function formatarProcesso(termo: string) {
  const digitos = termo.replace(/\D/g, "");
  if (!/^\d{20}$/.test(digitos)) {
    return null;
  }
  return `${digitos.slice(0, 7)}-${digitos.slice(7, 9)}.${digitos.slice(9, 13)}.${digitos.slice(13, 14)}.${digitos.slice(14, 16)}.${digitos.slice(16)}`;
}

function proximoUtil(iso: string) {
  let cursor = iso;
  while (!ehUtil(cursor)) {
    cursor = somarDias(cursor, 1);
  }
  return cursor;
}

function contarDiasUteis(inicio: string, quantidade: number) {
  let cursor = somarDias(inicio, 1);
  let uteis = 0;
  while (uteis < quantidade) {
    if (ehUtil(cursor)) {
      uteis += 1;
      if (uteis === quantidade) {
        return cursor;
      }
    }
    cursor = somarDias(cursor, 1);
  }
  return cursor;
}

function datasNoTexto(texto: string) {
  const achadas: string[] = [];
  const guardar = (iso: string | null) => {
    if (iso && dataIsoValida(iso) && !achadas.includes(iso)) {
      achadas.push(iso);
    }
  };

  for (const encontrado of texto.matchAll(
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
  )) {
    guardar(
      isoUtc(
        Number(encontrado[3]),
        Number(encontrado[2]),
        Number(encontrado[1]),
      ),
    );
  }

  const textoLimpo = semAcento(texto);
  for (const encontrado of textoLimpo.matchAll(
    /\b(\d{1,2}) de (janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de (\d{4})\b/g,
  )) {
    const mes = MESES[encontrado[2]];
    if (mes) {
      guardar(isoUtc(Number(encontrado[3]), mes, Number(encontrado[1])));
    }
  }

  return achadas;
}

function datasDeAudiencia(texto: string) {
  const faixas = [
    ...texto.matchAll(/audi[eê]ncia[\s\S]{0,80}/gi),
    ...texto.matchAll(/[\s\S]{0,40}audi[eê]ncia/gi),
  ];
  const datas = new Set<string>();
  for (const faixa of faixas) {
    for (const data of datasNoTexto(faixa[0])) {
      datas.add(data);
    }
  }
  return datas;
}

function areaDoTexto(
  texto: string,
  processo: string | null,
): AreaSugerida | null {
  const limpo = semAcento(texto);
  const justica = processo?.split(".")[2];
  if (
    justica === "5" ||
    /vara do trabalho|justica do trabalho|\btrt\b|reclamante|reclamad/.test(
      limpo,
    )
  ) {
    return "trabalhista";
  }
  if (
    /fazenda publica|mandado de seguranca|juizado especial da fazenda/.test(
      limpo,
    )
  ) {
    return "administrativo";
  }
  if (justica === "4") {
    return "administrativo";
  }
  if (
    /vara civel|juizo civel|juizado especial civel/.test(limpo) ||
    justica === "8"
  ) {
    return "civil";
  }
  return null;
}

function advogadosNoTexto(
  texto: string,
  pessoas: Array<{ id: number; nome: string }>,
) {
  const limpo = semAcento(texto);
  const ids: number[] = [];
  for (const pessoa of pessoas) {
    const nome = semAcento(pessoa.nome).trim();
    const partes = nome
      .split(/\s+/)
      .filter(Boolean)
      .map((parte) => parte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    if (partes.length === 0) {
      continue;
    }
    const junto = partes.join("\\s+");
    const trecho =
      partes.length === 1
        ? new RegExp(`\\b(?:dr|dra|advogado|advogada)\\.?\\s+${junto}\\b`)
        : new RegExp(`\\b${junto}\\b`);
    if (trecho.test(limpo)) {
      ids.push(pessoa.id);
    }
  }
  return ids;
}

export function sugerirPublicacao(
  textoBruto: string,
  hoje: string,
  pessoas: Array<{ id: number; nome: string }>,
): SugestaoPublicacao {
  const conteudo = textoBruto.replaceAll("\u0000", "").trim().slice(0, 200000);
  const vazio: SugestaoPublicacao = {
    area: null,
    data: null,
    titulo: null,
    observacao: null,
    conteudo,
    advogados: [],
    avisos: [],
  };
  if (!conteudo) {
    return { ...vazio, avisos: ["Cole a publicação antes de sugerir."] };
  }

  const avisos = [
    "Nada foi gravado. Confira os campos e use Salvar prazo.",
    "Feriado municipal não entra na conta.",
  ];
  const processo = numeroDoProcesso(conteudo);
  const area = areaDoTexto(conteudo, processo);
  const titulo = ATOS.find((ato) => ato.padrao.test(conteudo))?.titulo ?? null;
  const advogados = advogadosNoTexto(conteudo, pessoas);
  const audiencias = datasDeAudiencia(conteudo);
  const explicitas = datasNoTexto(conteudo).filter(
    (data) => !audiencias.has(data),
  );
  const futuras = explicitas.filter((data) => data >= hoje).sort();

  let data: string | null = null;
  if (futuras.length > 0) {
    const escolhida = futuras[0] ?? null;
    if (escolhida && !ehUtil(escolhida)) {
      data = proximoUtil(escolhida);
      avisos.push(
        `A data ${dataBr(escolhida)} não é dia útil. A sugestão foi para ${dataBr(data)}.`,
      );
    } else {
      data = escolhida;
    }
    if (futuras.length > 1) {
      avisos.push(
        "Há mais de uma data. A sugestão ficou na primeira. Confira.",
      );
    }
  } else {
    const quantidade = conteudo.match(/prazo de\s+(\d{1,3})\s+dias/i);
    const dias = quantidade ? Number(quantidade[1]) : 0;
    if (dias > 0 && dias <= 365) {
      data = contarDiasUteis(hoje, dias);
      avisos.push(
        `Contei ${dias} dias úteis a partir do dia seguinte a ${dataBr(hoje)}. Confira se a intimação é de hoje e se o prazo é em dias úteis.`,
      );
    }
  }

  for (const audiencia of audiencias) {
    avisos.push(`O texto cita audiência em ${dataBr(audiencia)}.`);
  }
  if (!titulo) {
    avisos.push("O título não ficou claro. Escreva o ato.");
  }
  if (!area) {
    avisos.push(
      "A área não ficou clara. O tipo continua o que já estava escolhido.",
    );
  }
  if (advogados.length > 0) {
    avisos.push("Confira o advogado marcado.");
  }
  if (explicitas.some((item) => item < hoje) && !data) {
    avisos.push("A data encontrada já passou. Informe o dia.");
  }

  return {
    area,
    data,
    titulo,
    observacao: processo ? `Processo ${processo}` : null,
    conteudo,
    advogados,
    avisos,
  };
}
