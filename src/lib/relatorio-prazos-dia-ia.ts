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

const SISTEMA = `Você extrai dados de publicações jurídicas brasileiras para a planilha da Agenda Coelho Vignini.

Para cada prazo, preencha:
- reclamante: nome da pessoa ou empresa autora / polo ativo (quem move a ação). Só o nome, limpo.
- reclamada: nome da pessoa ou empresa ré / polo passivo (quem responde). Só o nome, limpo. Se aparecer "SYLVAMO", complete para o nome empresarial completo quando o texto tiver (ex.: SYLVAMO DO BRASIL LTDA).
- data_adicional: outra data agendada no texto diferente da data do prazo (audiência, retorno, etc.), no formato dd/mm/aaaa. Se houver mais de uma, use no máximo duas separadas por "; ". Se não houver, string vazia.

Regras:
- Leia o texto inteiro (título + publicação). Não invente nomes.
- Ignore intimação, despacho, "Fica V. Sa.", fls., IDs de documento e instruções internas.
- Não use a observação/status como nome de parte (observação é recado do escritório).
- Se não encontrar com segurança, deixe string vazia.
- Responda SOMENTE JSON válido no formato:
{"itens":[{"id":1,"reclamante":"","reclamada":"","data_adicional":""}]}`;

function cortar(texto: string, limite: number) {
  const limpo = texto.replaceAll("\u0000", "").trim();
  if (limpo.length <= limite) {
    return limpo;
  }
  return `${limpo.slice(0, limite)}…`;
}

function parseJson(conteudo: string): ExtracaoPrazoIa[] {
  const cru = conteudo.trim();
  const bloco = cru.match(/\{[\s\S]*\}/)?.[0] ?? cru;
  const dados = JSON.parse(bloco) as {
    itens?: Array<{
      id?: number;
      reclamante?: string;
      reclamada?: string;
      data_adicional?: string;
    }>;
  };
  const itens = Array.isArray(dados.itens) ? dados.itens : [];
  return itens
    .map((item) => ({
      id: Number(item.id),
      reclamante: String(item.reclamante ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160),
      reclamada: String(item.reclamada ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160),
      dataAdicional: String(item.data_adicional ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80),
    }))
    .filter((item) => Number.isInteger(item.id) && item.id > 0);
}

async function extrairLote(lote: ItemBruto[]): Promise<ExtracaoPrazoIa[]> {
  const payload = lote.map((item) => ({
    id: item.id,
    data_do_prazo: dataBr(item.data),
    titulo: cortar(item.titulo, 300),
    publicacao: cortar(item.conteudo, 4500),
    processo_sugerido:
      numeroDoProcesso(item.conteudo, item.titulo, item.observacao) ?? "",
  }));

  const conteudo = await chatOpenRouter({
    json: true,
    temperature: 0,
    maxTokens: 3500,
    messages: [
      { role: "system", content: SISTEMA },
      {
        role: "user",
        content: `Extraia as partes destes ${lote.length} prazos:\n${JSON.stringify(payload)}`,
      },
    ],
  });

  return parseJson(conteudo);
}

/** Extrai reclamante/reclamada/data adicional via modelo. Sem chave, retorna mapa vazio. */
export async function extrairPartesRelatorioIa(itens: ItemBruto[]) {
  const mapa = new Map<number, ExtracaoPrazoIa>();
  if (!chaveOpenRouter() || itens.length === 0) {
    return mapa;
  }

  const validos = itens.filter((item) => dataIsoValida(item.data));
  const tamanhoLote = 8;

  for (let i = 0; i < validos.length; i += tamanhoLote) {
    const lote = validos.slice(i, i + tamanhoLote);
    try {
      const extraidos = await extrairLote(lote);
      for (const item of extraidos) {
        mapa.set(item.id, item);
      }
    } catch {
      // Mantém o que já veio; o relatório completa com fallback.
    }
  }

  return mapa;
}
