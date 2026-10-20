import { connection } from "next/server";
import { autenticarMcp } from "@/lib/mcp/auth";
import { tratarMensagemMcp } from "@/lib/mcp/protocolo";

export const maxDuration = 60;

function cors(resposta: Response) {
  resposta.headers.set("Access-Control-Allow-Origin", "*");
  resposta.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-Token, X-Api-Key, X-Auth-Token, Mcp-Session-Id",
  );
  resposta.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return resposta;
}

function naoAutorizado() {
  return cors(
    new Response(
      JSON.stringify({
        erro: "Token ausente ou inválido.",
        auth: [
          "Authorization: Bearer <token>",
          "X-Api-Key: <token>",
          "X-Auth-Token: <token>",
        ],
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "WWW-Authenticate": 'Bearer realm="agenda-mcp", charset="UTF-8"',
        },
      },
    ),
  );
}

export async function OPTIONS() {
  return cors(new Response(null, { status: 204 }));
}

export async function GET(pedido: Request) {
  await connection();
  const sessao = await autenticarMcp(pedido);
  if (!sessao) {
    return naoAutorizado();
  }
  const tratado = await tratarMensagemMcp(sessao, {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
  });
  return cors(
    Response.json(tratado.corpo, {
      status: tratado.status,
    }),
  );
}

export async function POST(pedido: Request) {
  await connection();
  const sessao = await autenticarMcp(pedido);
  if (!sessao) {
    return naoAutorizado();
  }

  let corpo: unknown;
  try {
    corpo = await pedido.json();
  } catch {
    return cors(Response.json({ erro: "JSON inválido." }, { status: 400 }));
  }

  if (Array.isArray(corpo)) {
    const respostas = [];
    for (const item of corpo) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const tratado = await tratarMensagemMcp(
        sessao,
        item as {
          method?: string;
          params?: unknown;
          jsonrpc?: string;
          id?: string | number | null;
        },
      );
      if (tratado.corpo !== null) {
        respostas.push(tratado.corpo);
      }
    }
    return cors(Response.json(respostas));
  }

  if (!corpo || typeof corpo !== "object") {
    return cors(
      Response.json({ erro: "Corpo JSON esperado." }, { status: 400 }),
    );
  }

  const tratado = await tratarMensagemMcp(
    sessao,
    corpo as {
      method?: string;
      metodo?: string;
      params?: unknown;
      arguments?: unknown;
      name?: string;
      jsonrpc?: string;
      id?: string | number | null;
    },
  );

  if (tratado.status === 202 && tratado.corpo === null) {
    return cors(new Response(null, { status: 202 }));
  }

  return cors(
    Response.json(tratado.corpo, {
      status: tratado.status,
    }),
  );
}
