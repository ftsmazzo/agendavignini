"use server";

import { and, gte, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterDb } from "@/db/client";
import { auditoria, prazos, prazosUsuarios } from "@/db/schema";
import { exigirAdmin } from "@/lib/acesso";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataIsoValida } from "@/lib/datas";

export async function tirarResponsaveis(
  _estado: { erro: string },
  formData: FormData,
): Promise<{ erro: string }> {
  const usuario = await exigirAdmin();
  const pedidos = [
    ...new Set(
      formData
        .getAll("prazos")
        .map((valor) => Number(valor))
        .filter((valor) => Number.isInteger(valor) && valor > 0),
    ),
  ].slice(0, 400);
  const diaBruto = String(formData.get("dia") ?? "").slice(0, 10);
  const hoje = hojeNoEscritorio();
  const dia = dataIsoValida(diaBruto) && diaBruto >= hoje ? diaBruto : hoje;

  if (pedidos.length === 0) {
    return { erro: "Escolha ao menos um prazo." };
  }

  const db = obterDb();
  const removidos = await db.transaction(async (tx) => {
    const futuros = await tx
      .select({ id: prazos.id })
      .from(prazos)
      .where(and(inArray(prazos.id, pedidos), gte(prazos.data, hoje)));
    if (futuros.length === 0) {
      return 0;
    }
    const ids = futuros.map((item) => item.id);
    const apagados = await tx
      .delete(prazosUsuarios)
      .where(inArray(prazosUsuarios.prazoId, ids))
      .returning({ prazoId: prazosUsuarios.prazoId });
    const quantidade = new Set(apagados.map((item) => item.prazoId)).size;
    if (quantidade > 0) {
      await tx.insert(auditoria).values({
        atorId: usuario.id,
        acao: "atualizar",
        entidade: "prazos",
        entidadeId: "tirar-advogado",
        detalhe: `${quantidade} prazos sem o vínculo`,
      });
    }
    return quantidade;
  });

  if (removidos === 0) {
    return { erro: "Esses prazos não tinham advogado, ou a data já passou." };
  }

  revalidatePath("/");
  revalidatePath("/resumo");
  revalidatePath("/prazos");
  revalidatePath("/admin/prazos");
  revalidatePath("/admin/prazos/sem-advogado");
  revalidatePath("/admin/prazos/tirar-advogado");
  revalidatePath("/admin/relatorios");
  redirect(`/admin/prazos/tirar-advogado?dia=${dia}&retirados=${removidos}`);
}
