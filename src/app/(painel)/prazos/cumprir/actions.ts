"use server";

import { and, asc, desc, eq, gt, inArray, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterDb } from "@/db/client";
import { auditoria, prazos } from "@/db/schema";
import { exigirUsuario } from "@/lib/acesso";
import { dataIsoValida } from "@/lib/datas";

export async function cumprirVarios(
  _estado: { erro: string },
  formData: FormData,
): Promise<{ erro: string }> {
  const usuario = await exigirUsuario();
  const pedidos = [
    ...new Set(
      formData
        .getAll("prazos")
        .map((valor) => Number(valor))
        .filter((valor) => Number.isInteger(valor) && valor > 0),
    ),
  ].slice(0, 400);
  const diaBruto = String(formData.get("dia") ?? "").slice(0, 10);
  const origem = formData.get("origem") === "atraso" ? "atraso" : "cumprir";
  if (!dataIsoValida(diaBruto)) {
    return { erro: "Escolha um dia válido." };
  }
  if (pedidos.length === 0) {
    return { erro: "Escolha ao menos um prazo." };
  }

  const db = obterDb();
  const resultado = await db.transaction(async (tx) => {
    const marcados = await tx
      .update(prazos)
      .set({
        situacao: "cumprido",
        cumpridoPorId: usuario.id,
        cumpridoEm: new Date(),
      })
      .where(
        and(
          inArray(prazos.id, pedidos),
          eq(prazos.situacao, "aberto"),
          eq(prazos.data, diaBruto),
        ),
      )
      .returning({ id: prazos.id });
    if (marcados.length === 0) {
      return { quantidade: 0, destino: diaBruto };
    }
    await tx.insert(auditoria).values({
      atorId: usuario.id,
      acao: "cumprir",
      entidade: "prazos",
      entidadeId: "cumprir-varios",
      detalhe: `${marcados.length} prazos em ${diaBruto}`,
    });
    const [proximo] = await tx
      .select({ data: prazos.data })
      .from(prazos)
      .where(
        and(
          eq(prazos.situacao, "aberto"),
          origem === "atraso"
            ? lt(prazos.data, diaBruto)
            : gt(prazos.data, diaBruto),
        ),
      )
      .orderBy(origem === "atraso" ? desc(prazos.data) : asc(prazos.data))
      .limit(1);
    const [restante] = await tx
      .select({ id: prazos.id })
      .from(prazos)
      .where(and(eq(prazos.data, diaBruto), eq(prazos.situacao, "aberto")))
      .limit(1);
    return {
      quantidade: marcados.length,
      destino: restante ? diaBruto : (proximo?.data ?? diaBruto),
    };
  });

  if (resultado.quantidade === 0) {
    return { erro: "Esses prazos já estavam cumpridos." };
  }

  revalidatePath("/");
  revalidatePath("/resumo");
  revalidatePath("/prazos");
  revalidatePath("/prazos/atraso");
  revalidatePath("/prazos/meus");
  revalidatePath("/prazos/cumprir");
  revalidatePath("/admin/prazos");
  revalidatePath("/admin/relatorios");
  const base = origem === "atraso" ? "/prazos/atraso" : "/prazos/cumprir";
  redirect(
    `${base}?dia=${resultado.destino}&cumpridos=${resultado.quantidade}`,
  );
}
