"use server";

import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
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
  const emAtraso = String(formData.get("fila") ?? "") === "atraso";
  const hoje = hojeNoEscritorio();
  const dia =
    dataIsoValida(diaBruto) && (emAtraso ? diaBruto < hoje : diaBruto >= hoje)
      ? diaBruto
      : hoje;
  const semVinculo = sql`not exists (select 1 from prazos_usuarios where prazo_id = ${prazos.id})`;

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
        emAtraso
          ? and(
              inArray(prazos.id, pedidos),
              eq(prazos.situacao, "aberto"),
              lt(prazos.data, hoje),
              semVinculo,
            )
          : and(
              inArray(prazos.id, pedidos),
              gte(prazos.data, hoje),
              semVinculo,
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
        detalhe: emAtraso
          ? `${quantidade} prazos vencidos sem advogado`
          : `${quantidade} prazos sem advogado`,
      });
    }
    return quantidade;
  });

  if (gravados === 0) {
    return {
      erro: emAtraso
        ? "Esses prazos já têm advogado ou já foram cumpridos."
        : "Esses prazos já têm advogado ou a data já passou.",
    };
  }

  revalidatePath("/");
  revalidatePath("/resumo");
  revalidatePath("/prazos");
  revalidatePath("/prazos/atraso");
  revalidatePath("/admin/prazos");
  revalidatePath("/admin/prazos/sem-advogado");
  revalidatePath("/admin/relatorios");
  revalidatePath("/processo", "layout");
  const [mesmo] = emAtraso
    ? await db
        .select({ total: sql<number>`count(*)::int` })
        .from(prazos)
        .where(
          and(eq(prazos.data, dia), eq(prazos.situacao, "aberto"), semVinculo),
        )
    : [];
  const [seguinte] =
    emAtraso && (mesmo?.total ?? 0) > 0
      ? [{ data: dia }]
      : await db
          .select({ data: prazos.data })
          .from(prazos)
          .where(
            emAtraso
              ? and(
                  lt(prazos.data, dia),
                  eq(prazos.situacao, "aberto"),
                  semVinculo,
                )
              : and(gte(prazos.data, dia), semVinculo),
          )
          .groupBy(prazos.data)
          .orderBy(emAtraso ? desc(prazos.data) : asc(prazos.data))
          .limit(1);
  const destino = seguinte?.data ?? dia;
  const params = new URLSearchParams();
  if (emAtraso) {
    params.set("fila", "atraso");
  }
  params.set("dia", destino);
  params.set("marcados", String(gravados));
  params.set("advogados", advogados.join(","));
  redirect(`/admin/prazos/sem-advogado?${params}`);
}
