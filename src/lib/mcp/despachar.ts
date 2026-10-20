import type { SessaoMcp } from "@/lib/mcp/auth";
import { TOOLS_MCP } from "@/lib/mcp/catalogo";
import {
  audienciaDetalheMcp,
  audienciasHojeMcp,
  audienciasIntervaloMcp,
  buscarPublicacaoMcp,
  contagemPainelMcp,
  contatosBuscarMcp,
  prazoDetalheMcp,
  prazosAtrasoMcp,
  prazosHojeMcp,
  prazosPorProcessoMcp,
  prazosSemanaMcp,
  resumoDiaUsuarioMcp,
} from "@/lib/mcp/consultas";

export async function despacharMcp(
  sessao: SessaoMcp,
  metodo: string,
  params: Record<string, unknown>,
) {
  switch (metodo) {
    case "catalogo":
    case "tools/list":
      return {
        servidor: "Agenda Coelho Vignini",
        modo: "somente leitura",
        perfil: sessao.perfil,
        token: sessao.nome,
        aviso:
          "Este MCP não grava, não cumpre prazo e não altera cadastro. Use o site da agenda para qualquer alteração.",
        tools: TOOLS_MCP,
      };
    case "contagem_painel":
      return contagemPainelMcp(params);
    case "prazos_hoje":
      return prazosHojeMcp(sessao, params);
    case "prazos_semana":
      return prazosSemanaMcp(sessao, params);
    case "prazos_atraso":
      return prazosAtrasoMcp(sessao, params);
    case "prazo_detalhe":
      return prazoDetalheMcp(sessao, params);
    case "buscar_publicacao":
      return buscarPublicacaoMcp(sessao, params);
    case "prazos_por_processo":
      return prazosPorProcessoMcp(sessao, params);
    case "audiencias_hoje":
      return audienciasHojeMcp(sessao, params);
    case "audiencias_intervalo":
      return audienciasIntervaloMcp(sessao, params);
    case "audiencia_detalhe":
      return audienciaDetalheMcp(sessao, params);
    case "resumo_dia_usuario":
      return resumoDiaUsuarioMcp(sessao, params);
    case "contatos_buscar":
      return contatosBuscarMcp(params);
    default:
      return {
        erro: `Tool desconhecida: ${metodo}. Chame catalogo para ver as tools.`,
      };
  }
}
