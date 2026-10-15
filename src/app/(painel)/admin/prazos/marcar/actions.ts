"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterDb } from "@/db/client";
import { auditoria, prazos, prazosUsuarios, usuarios } from "@/db/schema";
import { exigirAdmin } from "@/lib/acesso";
import { caminhoInterno } from "@/lib/datas";

export async function marcarUmAdvogado(formData: FormData) {
  const usuario = await exigirAdmin();
  const id = Number(String(formData.get("id") ?? ""));
  const advogadoId = Number(String(formData.get("advogado") ?? ""));
  const voltar = caminhoInterno(
    String(formData.get("voltar") ?? ""),
    "/prazos",
  );
  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    !Number.isInteger(advogadoId) ||
    advogadoId <= 0
  ) {
    redirect(voltar);
  }

  const db = obterDb();
  const [pessoa] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(and(eq(usuarios.id, advogadoId), eq(usuarios.ativo, true)))
    .limit(1);
  if (!pessoa) {
    redirect(voltar);
  }

  const gravou = await db.transaction(async (tx) => {
    const [livre] = await tx
      .select({ id: prazos.id })
      .from(prazos)
      .where(
        and(
          eq(prazos.id, id),
          eq(prazos.situacao, "aberto"),
          sql`not exists (select 1 from prazos_usuarios where prazo_id = ${prazos.id})`,
        ),
      )
      .limit(1);
    if (!livre) {
      return false;
    }
    const linhas = await tx
      .insert(prazosUsuarios)
      .values({ prazoId: id, usuarioId: advogadoId })
      .onConflictDoNothing()
      .returning({ prazoId: prazosUsuarios.prazoId });
    if (linhas.length === 0) {
      return false;
    }
    await tx.insert(auditoria).values({
      atorId: usuario.id,
      acao: "atualizar",
      entidade: "prazos",
      entidadeId: String(id),
      detalhe: `advogado ${advogadoId}`,
    });
    return true;
  });

  if (gravou) {
    revalidatePath("/");
    revalidatePath("/resumo");
    revalidatePath("/prazos");
    revalidatePath("/prazos/atraso");
    revalidatePath("/prazos/meus");
    revalidatePath("/admin/prazos");
    revalidatePath("/admin/prazos/sem-advogado");
    revalidatePath("/admin/prazos/tirar-advogado");
    revalidatePath("/admin/relatorios");
    revalidatePath("/busca");
    revalidatePath("/processo", "layout");
  }
  redirect(voltar);
}
