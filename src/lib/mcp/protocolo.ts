import type { SessaoMcp } from "@/lib/mcp/auth";
import { TOOLS_MCP } from "@/lib/mcp/catalogo";
import { despacharMcp } from "@/lib/mcp/despachar";

const PROTOCOLO = "2024-11-05";

function toolsNoFormatoMcp() {
  return TOOLS_MCP.map((tool) => {
    const properties: Record<string, { type: string; description: string }> =
      {};
    const required: string[] = [];
    for (const param of tool.parameters) {
      properties[param.nome] = {
        type: param.tipo === "number" ? "number" : "string",
        description: param.descricao,
      };
      if (param.obrigatorio) {
        required.push(param.nome);
      }
    }
    return {
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: "object",
        properties,
        ...(required.length > 0 ? { required } : {}),
        additionalProperties: false,
      },
    };
  });
}

function respostaJsonRpc(
  id: string | number | null | undefined,
  result: unknown,
) {
  return {
    jsonrpc: "2.0" as const,
    id: id ?? null,
    result,
  };
}

function erroJsonRpc(
  id: string | number | null | undefined,
  code: number,
  message: string,
) {
  return {
    jsonrpc: "2.0" as const,
    id: id ?? null,
    error: { code, message },
  };
}

export async function tratarMensagemMcp(
  sessao: SessaoMcp,
  bruto: {
    method?: string;
    metodo?: string;
    params?: unknown;
    arguments?: unknown;
    name?: string;
    jsonrpc?: string;
    id?: string | number | null;
  },
) {
  const metodo =
    bruto.method?.trim() || bruto.metodo?.trim() || (bruto.name?.trim() ?? "");
  const id = bruto.id;

  if (!metodo) {
    return {
      status: 400,
      corpo: erroJsonRpc(id, -32600, "Informe method."),
    };
  }

  // Notificação MCP: sem id e sem corpo de resposta.
  if (metodo === "notifications/initialized" || metodo === "initialized") {
    return { status: 202, corpo: null };
  }

  if (metodo === "initialize") {
    return {
      status: 200,
      corpo: respostaJsonRpc(id, {
        protocolVersion: PROTOCOLO,
        capabilities: { tools: {} },
        serverInfo: {
          name: "agenda-coelho-vignini",
          version: "1.0.0",
        },
        instructions:
          "MCP somente leitura da Agenda Coelho Vignini. Não grava, não cumpre e não altera cadastro.",
      }),
    };
  }

  if (metodo === "ping") {
    return { status: 200, corpo: respostaJsonRpc(id, {}) };
  }

  if (metodo === "tools/list" || metodo === "catalogo") {
    const tools = toolsNoFormatoMcp();
    if (bruto.jsonrpc === "2.0" || metodo === "tools/list") {
      return {
        status: 200,
        corpo: respostaJsonRpc(id, { tools }),
      };
    }
    return {
      status: 200,
      corpo: await despacharMcp(sessao, "catalogo", {}),
    };
  }

  let params: Record<string, unknown> = {};
  if (bruto.params && typeof bruto.params === "object") {
    params = bruto.params as Record<string, unknown>;
  } else if (bruto.arguments && typeof bruto.arguments === "object") {
    params = bruto.arguments as Record<string, unknown>;
  }

  if (metodo === "tools/call") {
    const nome = String(params.name ?? params.tool ?? "").trim();
    const args =
      params.arguments && typeof params.arguments === "object"
        ? (params.arguments as Record<string, unknown>)
        : {};
    if (!nome) {
      return {
        status: 400,
        corpo: erroJsonRpc(id, -32602, "tools/call exige params.name."),
      };
    }
    const resultado = await despacharMcp(sessao, nome, args);
    return {
      status: 200,
      corpo: respostaJsonRpc(id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(resultado, null, 2),
          },
        ],
        isError: Boolean(
          resultado &&
            typeof resultado === "object" &&
            "erro" in resultado &&
            (resultado as { erro?: string }).erro,
        ),
      }),
    };
  }

  // Atalho fino (mesmo do eleitoral): method = nome da tool.
  const resultado = await despacharMcp(sessao, metodo, params);
  if (bruto.jsonrpc === "2.0") {
    return {
      status: 200,
      corpo: respostaJsonRpc(id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(resultado, null, 2),
          },
        ],
      }),
    };
  }
  return { status: 200, corpo: resultado };
}
