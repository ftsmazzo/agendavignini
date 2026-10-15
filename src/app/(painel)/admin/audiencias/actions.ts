"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterDb } from "@/db/client";
import {
  audiencias,
  audienciasUsuarios,
  auditoria,
  usuarios,
} from "@/db/schema";
import { exigirAdmin, exigirUsuario } from "@/lib/acesso";
import { dataIsoValida, ehFimDeSemana, instanteEscritorio } from "@/lib/datas";
import { consultarTribunal } from "@/lib/infosimples";
import {
  listarProcessosCadastrados,
  type ProcessoCadastrado,
} from "@/lib/processos-cadastrados";
import { numeroDoProcesso } from "@/lib/publicacao";

function texto(formData: FormData, nome: string, limite: number) {
  return String(formData.get(nome) ?? "")
    .replaceAll("\u0000", "")
    .trim()
    .slice(0, limite);
}

export async function sugerirProcessos(
  termo: string,
): Promise<ProcessoCadastrado[]> {
  await exigirAdmin();
  return listarProcessosCadastrados(String(termo ?? ""));
}

export async function puxarCamposDoTribunal(numero: string): Promise<{
  erro: string;
  campos: {
    numero: string;
    vara: string;
    local: string;
    reclamante: string;
    reclamado: string;
  } | null;
}> {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "admin") {
    return {
      erro: "Só o administrador consulta o tribunal.",
      campos: null,
    };
  }
  const pedido = String(numero ?? "").trim();
  if (numeroDoProcesso(pedido) !== pedido) {
    return {
      erro: "Cole o número completo do processo para consultar o tribunal.",
      campos: null,
    };
  }
  const resultado = await consultarTribunal(pedido);
  if (resultado.erro || !resultado.consulta) {
    return {
      erro: resultado.erro || "A consulta não foi concluída.",
      campos: null,
    };
  }
  const consulta = resultado.consulta;
  if (
    !consulta.vara &&
    !consulta.local &&
    !consulta.reclamante &&
    !consulta.reclamado
  ) {
    return {
      erro: "A consulta terminou sem vara nem partes para preencher.",
      campos: null,
    };
  }
  return {
    erro: "",
    campos: {
      numero: pedido,
      vara: consulta.vara,
      local: consulta.local,
      reclamante: consulta.reclamante,
      reclamado: consulta.reclamado,
    },
  };
}

function atualizar() {
  revalidatePath("/audiencias");
  revalidatePath("/admin/audiencias");
  revalidatePath("/");
}

export async function salvarAudiencia(
  _estado: { erro: string },
  formData: FormData,
): Promise<{ erro: string }> {
  const ator = await exigirAdmin();
  const numeroProcesso = texto(formData, "numeroProcesso", 80);
  const vara = texto(formData, "vara", 160);
  const local = texto(formData, "local", 200);
  const reclamante = texto(formData, "reclamante", 200);
  const reclamado = texto(formData, "reclamado", 200);
  const preposto = texto(formData, "preposto", 200);
  const observacao = texto(formData, "observacao", 8000);
  const dataHora = instanteEscritorio(texto(formData, "dataHora", 16));
  const ids = [
    ...new Set(
      formData
        .getAll("advogados")
        .map((valor) => Number(valor))
        .filter((valor) => Number.isInteger(valor) && valor > 0),
    ),
  ];

  if (!dataHora) {
    return { erro: "Informe a data e a hora." };
  }
  const dia = texto(formData, "dataHora", 10);
  if (!dataIsoValida(dia) || ehFimDeSemana(dia)) {
    return { erro: "A audiência não cai em sábado nem domingo." };
  }

  const idBruto = texto(formData, "id", 12);
  const id = idBruto ? Number(idBruto) : null;
  if (idBruto && (!Number.isInteger(id) || (id ?? 0) <= 0)) {
    return { erro: "Essa audiência não está mais na lista." };
  }

  const db = obterDb();
  let jaLigados = new Set<number>();
  if (id) {
    const vinculos = await db
      .select({ usuarioId: audienciasUsuarios.usuarioId })
      .from(audienciasUsuarios)
      .where(eq(audienciasUsuarios.audienciaId, id));
    jaLigados = new Set(vinculos.map((item) => item.usuarioId));
  }
  if (ids.length > 0) {
    const escolhidos = await db
      .select({ id: usuarios.id, ativo: usuarios.ativo })
      .from(usuarios)
      .where(inArray(usuarios.id, ids));
    if (escolhidos.length !== ids.length) {
      return { erro: "Escolha advogados que existam no escritório." };
    }
    if (
      escolhidos.some((pessoa) => !pessoa.ativo && !jaLigados.has(pessoa.id))
    ) {
      return { erro: "Escolha advogados ativos." };
    }
  }

  const dados = {
    numeroProcesso,
    vara,
    local,
    reclamante: reclamante || null,
    reclamado: reclamado || null,
    preposto: preposto || null,
    dataHora,
    observacao: observacao || null,
  };

  if (id) {
    const salvo = await db.transaction(async (tx) => {
      const atualizado = await tx
        .update(audiencias)
        .set(dados)
        .where(eq(audiencias.id, id))
        .returning({ id: audiencias.id });
      if (atualizado.length === 0) {
        return false;
      }
      await tx
        .delete(audienciasUsuarios)
        .where(eq(audienciasUsuarios.audienciaId, id));
      if (ids.length > 0) {
        await tx
          .insert(audienciasUsuarios)
          .values(ids.map((usuarioId) => ({ audienciaId: id, usuarioId })));
      }
      await tx.insert(auditoria).values({
        atorId: ator.id,
        acao: "atualizar",
        entidade: "audiencias",
        entidadeId: String(id),
        detalhe: numeroProcesso || vara,
      });
      return true;
    });
    if (!salvo) {
      return { erro: "Essa audiência não está mais na lista." };
    }
    atualizar();
    redirect(`/admin/audiencias/${id}?salvo=1`);
  }

  const criadoId = await db.transaction(async (tx) => {
    const [criado] = await tx
      .insert(audiencias)
      .values(dados)
      .returning({ id: audiencias.id });
    if (!criado) {
      return null;
    }
    if (ids.length > 0) {
      await tx
        .insert(audienciasUsuarios)
        .values(
          ids.map((usuarioId) => ({ audienciaId: criado.id, usuarioId })),
        );
    }
    await tx.insert(auditoria).values({
      atorId: ator.id,
      acao: "criar",
      entidade: "audiencias",
      entidadeId: String(criado.id),
      detalhe: numeroProcesso || vara,
    });
    return criado.id;
  });
  if (!criadoId) {
    return { erro: "Não foi possível salvar a audiência." };
  }
  atualizar();
  redirect(`/admin/audiencias/${criadoId}?salvo=1`);
}

export async function excluirAudiencia(formData: FormData) {
  const ator = await exigirAdmin();
  const id = Number(String(formData.get("id") ?? ""));
  if (!Number.isInteger(id) || id <= 0) {
    redirect("/admin/audiencias");
  }
  const db = obterDb();
  const apagada = await db
    .delete(audiencias)
    .where(eq(audiencias.id, id))
    .returning({
      id: audiencias.id,
      numeroProcesso: audiencias.numeroProcesso,
    });
  if (apagada[0]) {
    await db.insert(auditoria).values({
      atorId: ator.id,
      acao: "excluir",
      entidade: "audiencias",
      entidadeId: String(id),
      detalhe: apagada[0].numeroProcesso,
    });
  }
  atualizar();
  redirect("/admin/audiencias?excluido=1");
}
