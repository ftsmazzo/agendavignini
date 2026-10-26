import { numeroDoProcesso } from "@/lib/publicacao";

const BASE = "https://api.infosimples.com/api/v2/consultas/";

export type VistaTribunal = {
  fonte: string;
  preco: string;
  partes: string[];
  reclamante: string;
  reclamado: string;
  vara: string;
  local: string;
  classe: string;
  assunto: string;
  valor: string;
  distribuicao: string;
  audiencias: string[];
  andamentos: string[];
  aviso: string;
  comprovante: string;
};

type Destino = {
  fonte: string;
  caminho: string;
  campos: Record<string, string>;
  aviso: string;
};

function tokenDaConta() {
  return process.env.INFOSIMPLES_TOKEN?.trim() ?? "";
}

function destinoDoNumero(numero: string): Destino | { erro: string } {
  const casa = numero.match(/^\d{7}-\d{2}\.\d{4}\.(\d)\.(\d{2})\.\d{4}$/);
  if (!casa || numeroDoProcesso(numero) !== numero) {
    return { erro: "Informe um número de processo no padrão CNJ." };
  }
  const justica = casa[1];
  const tribunal = casa[2];
  if (justica === "8" && tribunal === "26") {
    return {
      fonte: "TJSP, 1º grau",
      caminho: "tribunal/tjsp/primeiro-grau",
      campos: { processo: numero },
      aviso: "",
    };
  }
  if (justica === "5") {
    return {
      fonte: `TRT${Number(tribunal)}, 1º grau`,
      caminho: "tribunal/trt/processo",
      campos: { numero_processo: numero, grau: "1" },
      aviso:
        "O TRT não separa a audiência em um campo próprio. Se houver designação, ela aparece nos andamentos.",
    };
  }
  return {
    erro: "Por enquanto a consulta cobre o TJSP e os TRTs, no 1º grau.",
  };
}

function texto(valor: unknown, limite = 400) {
  if (typeof valor !== "string") {
    return "";
  }
  return valor.replaceAll("\u0000", "").trim().slice(0, limite);
}

function linhas(valor: unknown, chaves: string[], limite = 8) {
  const lista = Array.isArray(valor) ? valor : valor ? [valor] : [];
  return lista
    .slice(0, limite)
    .map((item) => {
      if (typeof item === "string") {
        return texto(item);
      }
      if (!item || typeof item !== "object") {
        return "";
      }
      const registro = item as Record<string, unknown>;
      return chaves
        .map((chave) => texto(registro[chave], 180))
        .filter(Boolean)
        .join(" · ");
    })
    .filter(Boolean);
}

function nomes(valor: unknown) {
  if (!Array.isArray(valor)) {
    return [];
  }
  return valor
    .slice(0, 8)
    .map((item) => {
      if (!item || typeof item !== "object") {
        return "";
      }
      const registro = item as Record<string, unknown>;
      const nome = texto(registro.nome, 180);
      const tipo = texto(registro.tipo, 80);
      return nome ? (tipo ? `${tipo}: ${nome}` : nome) : "";
    })
    .filter(Boolean);
}

function precoBr(valor: unknown) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) {
    return "";
  }
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function comprovanteSeguro(valor: unknown) {
  if (typeof valor !== "string" || !valor.startsWith("https://")) {
    return "";
  }
  try {
    const url = new URL(valor);
    if (url.username || url.password) {
      return "";
    }
    return url.toString();
  } catch {
    return "";
  }
}

const LIGACAO = new Set(["de", "da", "do", "das", "dos", "e"]);
const NAO_E_CIDADE = new Set([
  "trabalho",
  "civel",
  "familia",
  "fazenda",
  "infancia",
  "juventude",
  "execucao",
  "execucoes",
  "falencia",
  "falencias",
  "sucessoes",
  "registros",
  "publicos",
  "acidentes",
  "federal",
  "estadual",
  "unica",
  "juizado",
  "vara",
  "foro",
  "comarca",
  "tribunal",
  "central",
  "criminal",
]);

function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function apresentarCidade(valor: string) {
  const limpo = valor.replace(/\s+/g, " ").trim();
  const letras = limpo.replace(/[^A-Za-zÀ-ÿ]/g, "");
  const tudoMaiusculo =
    letras.length > 0 && letras === letras.toLocaleUpperCase("pt-BR");
  if (!tudoMaiusculo) {
    return limpo;
  }
  return limpo
    .toLocaleLowerCase("pt-BR")
    .replace(
      /(^|\s)([a-zà-ÿ])/g,
      (_, espaco: string, letra: string) =>
        espaco + letra.toLocaleUpperCase("pt-BR"),
    )
    .replace(/\b(De|Da|Do|Das|Dos|E)\b/g, (palavra) => palavra.toLowerCase());
}

function pareceCidade(valor: string) {
  const limpo = valor
    .replace(/\s*[/-]\s*[A-Za-z]{2}$/g, "")
    .replace(/[.,;]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!limpo || limpo.length > 60) {
    return "";
  }
  const nucleo = limpo
    .split(" ")
    .filter((parte) => !LIGACAO.has(semAcento(parte)));
  if (nucleo.length === 0 || nucleo.length > 5) {
    return "";
  }
  if (nucleo.some((parte) => NAO_E_CIDADE.has(semAcento(parte)))) {
    return "";
  }
  return apresentarCidade(limpo);
}

function cidadeNaVara(vara: string) {
  const limpa = vara.replace(/\s+/g, " ").trim();
  if (!limpa) {
    return "";
  }
  const partes = limpa.split(/\s+[-–—]\s+/);
  if (partes.length >= 2) {
    const ultimo = (partes[partes.length - 1] ?? "").trim();
    if (!/^[A-Za-z]{2}$/.test(ultimo)) {
      const direita = pareceCidade(ultimo);
      if (direita) {
        return direita;
      }
    }
  }
  const preposicoes = [...limpa.matchAll(/\bde\s+/gi)];
  for (let indice = preposicoes.length - 1; indice >= 0; indice -= 1) {
    const achado = preposicoes[indice];
    if (!achado || achado.index === undefined) {
      continue;
    }
    const cidade = pareceCidade(limpa.slice(achado.index + achado[0].length));
    if (cidade) {
      return cidade;
    }
  }
  return "";
}

function vistaDe(
  bruto: unknown,
  destino: Destino,
  preco: string,
): VistaTribunal {
  const bloco =
    Array.isArray(bruto) && bruto[0] && typeof bruto[0] === "object"
      ? (bruto[0] as Record<string, unknown>)
      : {};
  const processos = Array.isArray(bloco.processos) ? bloco.processos : [];
  const processo =
    processos[0] && typeof processos[0] === "object"
      ? (processos[0] as Record<string, unknown>)
      : null;
  const detalhes =
    bloco.detalhes && typeof bloco.detalhes === "object"
      ? (bloco.detalhes as Record<string, unknown>)
      : null;
  const ficha = processo ?? detalhes ?? {};
  const assuntos = Array.isArray(ficha.assuntos)
    ? ficha.assuntos
        .slice(0, 4)
        .map((item) =>
          item && typeof item === "object"
            ? texto((item as Record<string, unknown>).descricao, 180)
            : "",
        )
        .filter(Boolean)
        .join("; ")
    : texto(ficha.assunto);
  const andamentosTrt = linhas(bloco.itens, ["data", "titulo"], 6);
  const audienciasNosAndamentos = andamentosTrt.filter((item) =>
    /audi[eê]ncia/i.test(item),
  );
  const audiencias = [
    ...linhas(ficha.audiencias, ["data", "audiencia", "tipo", "situacao"], 8),
    ...audienciasNosAndamentos,
  ].slice(0, 8);
  const semTipo = (valor: string) => valor.replace(/^[^:]{0,40}:\s*/, "");
  const reclamante = processo
    ? texto(ficha.reqte) || texto(ficha.autor)
    : nomes(ficha.polo_ativo).map(semTipo).filter(Boolean).join(", ");
  const reclamado = processo
    ? texto(ficha.reqdo)
    : nomes(ficha.polo_passivo).map(semTipo).filter(Boolean).join(", ");
  const vara = texto(ficha.vara) || texto(ficha.orgao_julgador);
  const local =
    texto(ficha.foro) ||
    texto(ficha.comarca) ||
    texto(ficha.municipio) ||
    texto(ficha.cidade) ||
    cidadeNaVara(vara);

  return {
    fonte: destino.fonte,
    preco,
    partes: [reclamante, reclamado].filter(Boolean),
    reclamante,
    reclamado,
    vara,
    local,
    classe: texto(ficha.classe),
    assunto: assuntos,
    valor: texto(ficha.valor_acao) || texto(ficha.valor_causa),
    distribuicao: texto(ficha.distribuicao) || texto(ficha.data_distribuicao),
    audiencias,
    andamentos: processo
      ? linhas(ficha.ultimas_movimentacoes, ["data", "movimento"], 6)
      : andamentosTrt,
    aviso: destino.aviso,
    comprovante: "",
  };
}

function reciboDe(json: Record<string, unknown>, bloco: unknown) {
  const lista = Array.isArray(json.site_receipts) ? json.site_receipts : [];
  const primeiro = comprovanteSeguro(lista[0]);
  if (primeiro) {
    return primeiro;
  }
  if (bloco && typeof bloco === "object") {
    return comprovanteSeguro((bloco as Record<string, unknown>).site_receipt);
  }
  return "";
}

export async function consultarTribunal(
  numero: string,
): Promise<
  { erro: string; consulta: null } | { erro: ""; consulta: VistaTribunal }
> {
  const destino = destinoDoNumero(numero);
  if ("erro" in destino) {
    return { erro: destino.erro, consulta: null };
  }
  const token = tokenDaConta();
  if (!token) {
    return {
      erro: "O token ainda não está no servidor. No EasyPanel, no app, crie a variável INFOSIMPLES_TOKEN e reinicie.",
      consulta: null,
    };
  }

  const corpo = new URLSearchParams({
    token,
    timeout: "90",
    ...destino.campos,
  });
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}${destino.caminho}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: corpo,
      cache: "no-store",
      signal: AbortSignal.timeout(100_000),
    });
  } catch {
    return {
      erro: "O tribunal não respondeu a tempo. Tente de novo em alguns minutos.",
      consulta: null,
    };
  }

  let json: Record<string, unknown>;
  try {
    const lido: unknown = await resposta.json();
    json =
      lido && typeof lido === "object" ? (lido as Record<string, unknown>) : {};
  } catch {
    return {
      erro: "A Infosimples devolveu uma resposta incompleta.",
      consulta: null,
    };
  }

  const codigo = Number(json.code);
  if (codigo !== 200) {
    return { erro: mensagemDoCodigo(codigo, json), consulta: null };
  }
  const header =
    json.header && typeof json.header === "object"
      ? (json.header as Record<string, unknown>)
      : {};
  const consulta = vistaDe(json.data, destino, precoBr(header.price));
  consulta.comprovante = reciboDe(
    json,
    Array.isArray(json.data) ? json.data[0] : null,
  );
  if (
    !consulta.reclamante &&
    !consulta.reclamado &&
    !consulta.vara &&
    consulta.audiencias.length === 0 &&
    consulta.andamentos.length === 0
  ) {
    return {
      erro: "A consulta terminou sem dados públicos desse processo.",
      consulta: null,
    };
  }
  return { erro: "", consulta };
}

function mensagemDoCodigo(codigo: number, json: Record<string, unknown>) {
  if (codigo === 601 || codigo === 603) {
    return "O token foi recusado ou esta consulta não está liberada na conta da Infosimples.";
  }
  if (codigo === 605) {
    return "O tribunal demorou além do tempo da consulta.";
  }
  if (codigo === 608) {
    return "O tribunal não encontrou esse processo na consulta pública.";
  }
  const mensagem = texto(json.code_message, 180);
  if (/n[aã]o mudar[aá] em breve/i.test(mensagem)) {
    return "O tribunal recusou essa consulta. Escolha um processo da lista ou preencha os campos.";
  }
  return mensagem || "A consulta não foi concluída.";
}
