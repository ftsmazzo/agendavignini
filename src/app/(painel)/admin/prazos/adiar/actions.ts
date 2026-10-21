"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterDb } from "@/db/client";
import { auditoria, notificacoes, prazos, prazosUsuarios } from "@/db/schema";
import { exigirAdmin } from "@/lib/acesso";
import { linhasDeAviso } from "@/lib/avisos";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataIsoValida } from "@/lib/datas";
import { ehDiaUtil } from "@/lib/publicacao";

export async function adiarPrazos(
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
  const origem = String(formData.get("dia") ?? "").slice(0, 10);
  const destino = String(formData.get("destino") ?? "").slice(0, 10);
  const hoje = hojeNoEscritorio();

  if (!dataIsoValida(origem)) {
    return { erro: "Escolha o dia dos prazos." };
  }
  if (pedidos.length === 0) {
    return { erro: "Escolha ao menos um prazo." };
  }
  if (!ehDiaUtil(destino)) {
    return { erro: "A nova data precisa ser um dia útil." };
  }
  if (destino < hoje) {
    return { erro: "A nova data é hoje ou um dia à frente." };
  }
  if (destino <= origem) {
    return { erro: "A nova data fica depois do dia atual do prazo." };
  }

  const db = obterDb();
  const quantidade = await db.transaction(async (tx) => {
    const atuais = await tx
      .select({ id: prazos.id, data: prazos.data, titulo: prazos.titulo })
      .from(prazos)
      .where(
        and(
          inArray(prazos.id, pedidos),
          eq(prazos.situacao, "aberto"),
          eq(prazos.data, origem),
        ),
      );
    if (atuais.length === 0) {
      return 0;
    }
    const idsAtuais = atuais.map((item) => item.id);
    const movidos = await tx
      .update(prazos)
      .set({ data: destino })
      .where(
        and(
          inArray(prazos.id, idsAtuais),
          eq(prazos.situacao, "aberto"),
          eq(prazos.data, origem),
        ),
      )
      .returning({ id: prazos.id });
    if (movidos.length === 0) {
      return 0;
    }
    const movidosIds = new Set(movidos.map((item) => item.id));
    const vinculos = await tx
      .select({
        prazoId: prazosUsuarios.prazoId,
        usuarioId: prazosUsuarios.usuarioId,
      })
      .from(prazosUsuarios)
      .where(inArray(prazosUsuarios.prazoId, [...movidosIds]));
    const porPrazo = new Map<number, number[]>();
    for (const vinculo of vinculos) {
      const lista = porPrazo.get(vinculo.prazoId) ?? [];
      lista.push(vinculo.usuarioId);
      porPrazo.set(vinculo.prazoId, lista);
    }
    const avisos = atuais
      .filter((item) => movidosIds.has(item.id))
      .flatMap((item) =>
        linhasDeAviso({
          prazoId: item.id,
          titulo: item.titulo,
          dataAnterior: item.data,
          dataNova: destino,
          advogados: porPrazo.get(item.id) ?? [],
          atorId: usuario.id,
        }),
      );
    if (avisos.length > 0) {
      await tx.insert(notificacoes).values(avisos);
    }
    await tx.insert(auditoria).values({
      atorId: usuario.id,
      acao: "atualizar",
      entidade: "prazos",
      entidadeId: "adiar",
      detalhe: `${movidos.length} prazos de ${origem} para ${destino}`,
    });
    return movidos.length;
  });

  if (quantidade === 0) {
    return {
      erro: "Esses prazos já mudaram de dia ou já foram cumpridos.",
    };
  }

  revalidatePath("/");
  revalidatePath("/resumo");
  revalidatePath("/prazos");
  revalidatePath("/prazos/atraso");
  revalidatePath("/prazos/meus");
  revalidatePath("/prazos/cumprir");
  revalidatePath("/admin/prazos");
  revalidatePath("/admin/prazos/adiar");
  revalidatePath("/admin/relatorios");
  revalidatePath("/busca");
  revalidatePath("/conta");
  revalidatePath("/", "layout");
  redirect(
    `/admin/prazos/adiar?dia=${origem}&destino=${destino}&adiados=${quantidade}`,
  );
}
