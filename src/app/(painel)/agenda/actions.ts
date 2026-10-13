"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterDb } from "@/db/client";
import { auditoria, contatos } from "@/db/schema";
import { exigirUsuario } from "@/lib/acesso";
import { dataIsoValida } from "@/lib/datas";

function texto(formData: FormData, nome: string, limite: number) {
  return String(formData.get(nome) ?? "")
    .trim()
    .slice(0, limite);
}

function lerContato(formData: FormData) {
  const nome = texto(formData, "nome", 200);
  const telefone = texto(formData, "telefone", 40);
  const celular = texto(formData, "celular", 40);
  const email = texto(formData, "email", 200);
  const endereco = texto(formData, "endereco", 300);
  const nascimento = texto(formData, "nascimento", 10);

  if (!nome) {
    return { erro: "Informe o nome." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { erro: "O e-mail não parece válido." };
  }
  if (nascimento && !dataIsoValida(nascimento)) {
    return { erro: "A data de nascimento não é válida." };
  }

  return {
    erro: "",
    dados: {
      nome,
      telefone,
      celular: celular || null,
      email: email || null,
      endereco: endereco || null,
      nascimento: nascimento || null,
    },
  };
}

export async function salvarContato(
  _estado: { erro: string },
  formData: FormData,
): Promise<{ erro: string }> {
  const usuario = await exigirUsuario();
  const lido = lerContato(formData);
  if (!("dados" in lido) || !lido.dados) {
    return { erro: lido.erro };
  }

  const idBruto = texto(formData, "id", 12);
  const db = obterDb();

  if (idBruto) {
    const id = Number(idBruto);
    if (!Number.isInteger(id) || id <= 0) {
      return { erro: "Esse contato não está mais na agenda." };
    }
    const atualizado = await db
      .update(contatos)
      .set(lido.dados)
      .where(eq(contatos.id, id))
      .returning({ id: contatos.id });
    if (atualizado.length === 0) {
      return { erro: "Esse contato não está mais na agenda." };
    }
    await db.insert(auditoria).values({
      atorId: usuario.id,
      acao: "atualizar",
      entidade: "contatos",
      entidadeId: String(id),
      detalhe: lido.dados.nome,
    });
    revalidatePath("/agenda");
    revalidatePath("/agenda/lista");
    redirect(`/agenda/${id}?salvo=1`);
  }

  const [criado] = await db
    .insert(contatos)
    .values(lido.dados)
    .returning({ id: contatos.id });
  if (!criado) {
    return { erro: "Não foi possível salvar o contato." };
  }
  await db.insert(auditoria).values({
    atorId: usuario.id,
    acao: "criar",
    entidade: "contatos",
    entidadeId: String(criado.id),
    detalhe: lido.dados.nome,
  });
  revalidatePath("/agenda");
  revalidatePath("/agenda/lista");
  redirect(`/agenda/${criado.id}?salvo=1`);
}

export async function excluirContato(formData: FormData) {
  const usuario = await exigirUsuario();
  const id = Number(String(formData.get("id") ?? ""));
  if (!Number.isInteger(id) || id <= 0) {
    redirect("/agenda");
  }

  const db = obterDb();
  const apagado = await db
    .delete(contatos)
    .where(eq(contatos.id, id))
    .returning({ id: contatos.id, nome: contatos.nome });
  if (apagado[0]) {
    await db.insert(auditoria).values({
      atorId: usuario.id,
      acao: "excluir",
      entidade: "contatos",
      entidadeId: String(id),
      detalhe: apagado[0].nome,
    });
  }
  revalidatePath("/agenda");
  revalidatePath("/agenda/lista");
  redirect("/agenda?excluido=1");
}
