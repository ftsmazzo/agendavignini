import { connection } from "next/server";
import { exigirAdmin } from "@/lib/acesso";
import { skillPorArquivo } from "@/lib/mcp/skills";

export async function GET(
  _pedido: Request,
  contexto: { params: Promise<{ arquivo: string }> },
) {
  await connection();
  await exigirAdmin();
  const { arquivo } = await contexto.params;
  const skill = skillPorArquivo(arquivo);
  if (!skill) {
    return new Response("Skill não encontrada.", { status: 404 });
  }
  return new Response(skill.conteudo, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${skill.arquivo}"`,
    },
  });
}
