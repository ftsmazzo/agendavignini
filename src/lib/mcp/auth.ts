import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { obterDb } from "@/db/client";
import { mcpTokens } from "@/db/schema";

type PerfilMcp = "escritorio" | "pessoal";

export type SessaoMcp = {
  id: number | null;
  nome: string;
  perfil: PerfilMcp;
  usuarioId: number | null;
  mestre: boolean;
};

export function hashDoToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function gerarTokenBruto() {
  return `agv_${randomBytes(24).toString("hex")}`;
}

export function prefixoDoToken(token: string) {
  return token.slice(0, 12);
}

function tokenMestreConfere(recebido: string) {
  const esperado = process.env.MCP_TOKEN?.trim() ?? "";
  if (esperado.length < 24 || recebido.length !== esperado.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado));
}

function tokenDoPedido(pedido: Request) {
  const auth = pedido.headers.get("authorization") ?? "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) {
    return bearer;
  }
  // Claude.ai (conector com cabeçalho estático) aceita estes nomes.
  const apiKey = pedido.headers.get("x-api-key")?.trim();
  if (apiKey) {
    return apiKey.replace(/^Bearer\s+/i, "");
  }
  const authToken = pedido.headers.get("x-auth-token")?.trim();
  if (authToken) {
    return authToken.replace(/^Bearer\s+/i, "");
  }
  return pedido.headers.get("x-token")?.trim() ?? "";
}

export async function autenticarMcp(
  pedido: Request,
): Promise<SessaoMcp | null> {
  const token = tokenDoPedido(pedido);
  if (!token) {
    return null;
  }
  if (tokenMestreConfere(token)) {
    return {
      id: null,
      nome: "Token mestre",
      perfil: "escritorio",
      usuarioId: null,
      mestre: true,
    };
  }

  const db = obterDb();
  const hash = hashDoToken(token);
  const [linha] = await db
    .select({
      id: mcpTokens.id,
      nome: mcpTokens.nome,
      perfil: mcpTokens.perfil,
      usuarioId: mcpTokens.usuarioId,
      ativo: mcpTokens.ativo,
    })
    .from(mcpTokens)
    .where(and(eq(mcpTokens.tokenHash, hash), eq(mcpTokens.ativo, true)))
    .limit(1);

  if (!linha) {
    return null;
  }

  const perfil: PerfilMcp =
    linha.perfil === "pessoal" ? "pessoal" : "escritorio";
  if (perfil === "pessoal" && !linha.usuarioId) {
    return null;
  }

  await db
    .update(mcpTokens)
    .set({
      ultimoUso: new Date(),
      usoTotal: sql`${mcpTokens.usoTotal} + 1`,
    })
    .where(eq(mcpTokens.id, linha.id));

  return {
    id: linha.id,
    nome: linha.nome,
    perfil,
    usuarioId: linha.usuarioId,
    mestre: false,
  };
}
