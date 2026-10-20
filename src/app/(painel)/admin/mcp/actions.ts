"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { obterDb } from "@/db/client";
import { auditoria, mcpTokens, usuarios } from "@/db/schema";
import { exigirAdmin } from "@/lib/acesso";
import { gerarTokenBruto, hashDoToken, prefixoDoToken } from "@/lib/mcp/auth";

function texto(formData: FormData, nome: string, limite: number) {
  return String(formData.get(nome) ?? "")
    .replaceAll("\u0000", "")
    .trim()
    .slice(0, limite);
}

export async function criarTokenMcp(
  _estado: { erro: string; token: string },
  formData: FormData,
): Promise<{ erro: string; token: string }> {
  const ator = await exigirAdmin();
  const nome = texto(formData, "nome", 80);
  const perfil =
    texto(formData, "perfil", 20) === "pessoal" ? "pessoal" : "escritorio";
  const usuarioBruto = texto(formData, "usuario_id", 12);
  const usuarioId = usuarioBruto ? Number(usuarioBruto) : null;

  if (!nome) {
    return { erro: "Informe um nome para o token.", token: "" };
  }
  if (perfil === "pessoal") {
    if (!usuarioId || !Number.isFinite(usuarioId)) {
      return {
        erro: "Token pessoal precisa de um advogado vinculado.",
        token: "",
      };
    }
    const db = obterDb();
    const [pessoa] = await db
      .select({ id: usuarios.id, ativo: usuarios.ativo })
      .from(usuarios)
      .where(eq(usuarios.id, usuarioId))
      .limit(1);
    if (!pessoa?.ativo) {
      return { erro: "Advogado não encontrado ou inativo.", token: "" };
    }
  }

  const token = gerarTokenBruto();
  const db = obterDb();
  const [criado] = await db
    .insert(mcpTokens)
    .values({
      nome,
      prefixo: prefixoDoToken(token),
      tokenHash: hashDoToken(token),
      perfil,
      usuarioId: perfil === "pessoal" ? usuarioId : null,
    })
    .returning({ id: mcpTokens.id });

  await db.insert(auditoria).values({
    atorId: ator.id,
    acao: "criar",
    entidade: "mcp_token",
    entidadeId: String(criado?.id ?? ""),
    detalhe: `${nome} · ${perfil}`,
  });

  revalidatePath("/admin/mcp");
  return { erro: "", token };
}

export async function revogarTokenMcp(formData: FormData) {
  const ator = await exigirAdmin();
  const id = Number(texto(formData, "id", 12));
  if (!Number.isFinite(id) || id <= 0) {
    return;
  }
  const db = obterDb();
  await db
    .update(mcpTokens)
    .set({ ativo: false })
    .where(eq(mcpTokens.id, Math.trunc(id)));
  await db.insert(auditoria).values({
    atorId: ator.id,
    acao: "revogar",
    entidade: "mcp_token",
    entidadeId: String(Math.trunc(id)),
  });
  revalidatePath("/admin/mcp");
}
