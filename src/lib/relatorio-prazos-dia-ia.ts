import { dataBr, dataIsoValida } from "@/lib/datas";
import { chatOpenRouter, chaveOpenRouter } from "@/lib/openrouter";
import { numeroDoProcesso } from "@/lib/publicacao";

export type ExtracaoPrazoIa = {
  id: number;
  reclamante: string;
  reclamada: string;
  dataAdicional: string;
};

type ItemBruto = {
  id: number;
  data: string;
  titulo: string;
  observacao: string;
  conteudo: string;
};

const SISTEMA = `Você é assistente de um escritório trabalhista/cível brasileiro.
Sua tarefa é ler a publicação e devolver os nomes das partes.

Campos:
- reclamante: autor / polo ativo (pessoa física ou empresa que move a ação)
- reclamada: réu / polo passivo (ex.: SYLVAMO DO BRASIL LTDA, BANCO ..., empresa)
- data_adicional: outra data de ato futuro citada no texto (audiência etc.), dd/mm/aaaa; no máximo 2, separadas por "; "; senão ""

Como achar:
1) Padrão "NOME X NOME" ou "NOME x NOME" perto do número do processo.
2) Rótulos "Reclamante:", "Reclamada:", "Reclamado:", "Autor:", "Réu:".
3) Complete nomes curtos de empresa (SYLVAMO → SYLVAMO DO BRASIL LTDA) se o texto tiver a forma longa.

Proibido:
- Inventar nome
- Copiar intimação, fls., "Fica V. Sa.", despacho
- Usar a observação/status do escritório como nome

Se o texto tiver o padrão X, preencha os dois lados. Responda só JSON:
{"reclamante":"","reclamada":"","data_adicional":""}`;

function cortar(texto: string, limite: number) {
  const limpo = texto.replaceAll("\u0000", "").trim();
  if (limpo.length <= limite) {
    return limpo;
  }
  return `${limpo.slice(0, limite)}…`;
}

function nomeValido(valor: string) {
  const limpo = valor.replace(/\s+/g, " ").trim();
  if (limpo.length < 2 || limpo.length > 160) {
    return "";
  }
  if (
    /^(n\/?a|não encontrado|nao encontrado|desconhecido|null|undefined|—|-|sem nome|não informado|nao informado)$/i.test(
      limpo,
    )
  ) {
    return "";
  }
  return limpo;
}

function parseJson(conteudo: string, id: number): ExtracaoPrazoIa | null {
  const cru = conteudo.trim();
  const bloco = cru.match(/\{[\s\S]*\}/)?.[0] ?? cru;
  try {
    const dados = JSON.parse(bloco) as {
      reclamante?: string;
      reclamada?: string;
      data_adicional?: string;
    };
    return {
      id,
      reclamante: nomeValido(String(dados.reclamante ?? "")),
      reclamada: nomeValido(String(dados.reclamada ?? "")),
      dataAdicional: nomeValido(String(dados.data_adicional ?? "")).slice(
        0,
        80,
      ),
    };
  } catch {
    return null;
  }
}

async function extrairUm(item: ItemBruto): Promise<ExtracaoPrazoIa | null> {
  const processo =
    numeroDoProcesso(item.conteudo, item.titulo, item.observacao) ?? "";
  const conteudo = await chatOpenRouter({
    json: true,
    temperature: 0,
    maxTokens: 400,
    messages: [
      { role: "system", content: SISTEMA },
      {
        role: "user",
        content: [
          `Data do prazo: ${dataBr(item.data)}`,
          `Processo (se já achado): ${processo || "(não achado)"}`,
          `Título: ${cortar(item.titulo, 400)}`,
          `Publicação:\n${cortar(item.conteudo, 6000)}`,
        ].join("\n"),
      },
    ],
  });
  return parseJson(conteudo, item.id);
}

async function mapaEmParalelo(
  itens: ItemBruto[],
  concorrencia: number,
): Promise<Map<number, ExtracaoPrazoIa>> {
  const mapa = new Map<number, ExtracaoPrazoIa>();
  let indice = 0;

  async function trabalhador() {
    while (indice < itens.length) {
      const atual = indice;
      indice += 1;
      const item = itens[atual];
      if (!item) {
        continue;
      }
      try {
        const extraido = await extrairUm(item);
        if (extraido) {
          mapa.set(extraido.id, extraido);
        }
      } catch {
        // Fallback local cobre este item.
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concorrencia, itens.length) }, () =>
      trabalhador(),
    ),
  );
  return mapa;
}

/**
 * Completa só os prazos que ainda estão sem reclamante ou reclamada.
 * Sem chave OpenRouter, devolve mapa vazio.
 */
export async function extrairPartesRelatorioIa(
  itens: ItemBruto[],
  precisar: Set<number>,
) {
  if (!chaveOpenRouter() || precisar.size === 0) {
    return new Map<number, ExtracaoPrazoIa>();
  }
  const fila = itens.filter(
    (item) => dataIsoValida(item.data) && precisar.has(item.id),
  );
  return mapaEmParalelo(fila, 4);
}
