import { connection } from "next/server";
import { autenticarMcp } from "@/lib/mcp/auth";
import { despacharMcp } from "@/lib/mcp/despachar";

export const maxDuration = 60;

function cors(resposta: Response) {
  resposta.headers.set("Access-Control-Allow-Origin", "*");
  resposta.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-Token",
  );
  resposta.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return resposta;
}

export async function OPTIONS() {
  return cors(new Response(null, { status: 204 }));
}

export async function GET(pedido: Request) {
  await connection();
  const sessao = await autenticarMcp(pedido);
  if (!sessao) {
    return cors(
      Response.json(
        {
          servidor: "Agenda Coelho Vignini MCP",
          modo: "somente leitura",
          auth: "Authorization: Bearer <token>",
          uso: 'POST JSON {"method":"catalogo"} ou {"method":"prazos_hoje","params":{}}',
        },
        { status: 200 },
      ),
    );
  }
  const resultado = await despacharMcp(sessao, "catalogo", {});
  return cors(Response.json(resultado));
}

export async function POST(pedido: Request) {
  await connection();
  const sessao = await autenticarMcp(pedido);
  if (!sessao) {
    return cors(
      Response.json({ erro: "Token ausente ou inválido." }, { status: 401 }),
    );
  }

  let corpo: unknown;
  try {
    corpo = await pedido.json();
  } catch {
    return cors(Response.json({ erro: "JSON inválido." }, { status: 400 }));
  }

  if (!corpo || typeof corpo !== "object") {
    return cors(
      Response.json({ erro: "Corpo JSON esperado." }, { status: 400 }),
    );
  }

  const bruto = corpo as {
    method?: string;
    metodo?: string;
    params?: unknown;
    arguments?: unknown;
    name?: string;
    jsonrpc?: string;
    id?: string | number | null;
  };

  const metodo =
    bruto.method?.trim() || bruto.metodo?.trim() || (bruto.name?.trim() ?? "");

  if (!metodo) {
    return cors(
      Response.json(
        {
          erro: 'Informe method. Ex.: {"method":"catalogo"} ou {"method":"prazos_hoje","params":{}}',
        },
        { status: 400 },
      ),
    );
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
      return cors(
        Response.json(
          { erro: "tools/call exige params.name." },
          { status: 400 },
        ),
      );
    }
    const resultado = await despacharMcp(sessao, nome, args);
    if (bruto.jsonrpc === "2.0") {
      return cors(
        Response.json({
          jsonrpc: "2.0",
          id: bruto.id ?? null,
          result: resultado,
        }),
      );
    }
    return cors(Response.json(resultado));
  }

  const resultado = await despacharMcp(sessao, metodo, params);
  if (bruto.jsonrpc === "2.0") {
    return cors(
      Response.json({
        jsonrpc: "2.0",
        id: bruto.id ?? null,
        result: resultado,
      }),
    );
  }
  return cors(Response.json(resultado));
}
