"use server";

import { and, gte, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterDb } from "@/db/client";
import { auditoria, prazos, prazosUsuarios, usuarios } from "@/db/schema";
import { exigirAdmin } from "@/lib/acesso";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataIsoValida } from "@/lib/datas";

function idsDe(formData: FormData, nome: string) {
  return [
    ...new Set(
      formData
        .getAll(nome)
        .map((valor) => Number(valor))
        .filter((valor) => Number.isInteger(valor) && valor > 0),
    ),
  ].slice(0, 400);
}

export async function marcarResponsaveis(
  _estado: { erro: string },
  formData: FormData,
): Promise<{ erro: string }> {
  const usuario = await exigirAdmin();
  const advogados = idsDe(formData, "advogados");
  const pedidos = idsDe(formData, "prazos");
  const diaBruto = String(formData.get("dia") ?? "").slice(0, 10);
  const hoje = hojeNoEscritorio();
  const dia = dataIsoValida(diaBruto) && diaBruto >= hoje ? diaBruto : hoje;

  if (pedidos.length === 0) {
    return { erro: "Escolha ao menos um prazo." };
  }
  if (advogados.length === 0) {
    return { erro: "Escolha ao menos um advogado." };
  }

  const db = obterDb();
  const pessoas = await db
    .select({ id: usuarios.id, ativo: usuarios.ativo })
    .from(usuarios)
    .where(inArray(usuarios.id, advogados));
  if (
    pessoas.length !== advogados.length ||
    pessoas.some((pessoa) => !pessoa.ativo)
  ) {
    return { erro: "Escolha advogados ativos." };
  }

  const gravados = await db.transaction(async (tx) => {
    const livres = await tx
      .select({ id: prazos.id })
      .from(prazos)
      .where(
        and(
          inArray(prazos.id, pedidos),
          gte(prazos.data, hoje),
          sql`not exists (select 1 from prazos_usuarios where prazo_id = ${prazos.id})`,
        ),
      );
    if (livres.length === 0) {
      return 0;
    }
    const inseridos = await tx
      .insert(prazosUsuarios)
      .values(
        livres.flatMap((prazo) =>
          advogados.map((usuarioId) => ({ prazoId: prazo.id, usuarioId })),
        ),
      )
      .onConflictDoNothing()
      .returning({ prazoId: prazosUsuarios.prazoId });
    const quantidade = new Set(inseridos.map((item) => item.prazoId)).size;
    if (quantidade > 0) {
      await tx.insert(auditoria).values({
        atorId: usuario.id,
        acao: "atualizar",
        entidade: "prazos",
        entidadeId: "sem-advogado",
        detalhe: `${quantidade} prazos sem advogado`,
      });
    }
    return quantidade;
  });

  if (gravados === 0) {
    return { erro: "Esses prazos já têm advogado ou a data já passou." };
  }

  revalidatePath("/");
  revalidatePath("/resumo");
  revalidatePath("/prazos");
  revalidatePath("/admin/prazos");
  revalidatePath("/admin/prazos/sem-advogado");
  revalidatePath("/admin/relatorios");
  redirect(`/admin/prazos/sem-advogado?dia=${dia}&marcados=${gravados}`);
}
