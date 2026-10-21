"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterDb } from "@/db/client";
import {
  auditoria,
  notificacoes,
  prazos,
  prazosUsuarios,
  usuarios,
} from "@/db/schema";
import { exigirAdmin, exigirUsuario } from "@/lib/acesso";
import { linhasDeAviso } from "@/lib/avisos";
import { hojeNoEscritorio } from "@/lib/contagens";
import {
  caminhoInterno,
  dataIsoValida,
  ehFimDeSemana,
  instanteEscritorio,
} from "@/lib/datas";
import { datasRecorrentes } from "@/lib/recorrencia";

const AREAS = new Set(["administrativo", "civil", "trabalhista"]);

function texto(formData: FormData, nome: string, limite: number) {
  return String(formData.get(nome) ?? "")
    .replaceAll("\u0000", "")
    .trim()
    .slice(0, limite);
}

function voltarDe(formData: FormData) {
  return caminhoInterno(String(formData.get("voltar") ?? ""), "/prazos");
}

function atualizarListas() {
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
  revalidatePath("/processo", "layout");
  revalidatePath("/conta");
  revalidatePath("/", "layout");
}

export async function salvarPrazo(
  _estado: { erro: string },
  formData: FormData,
): Promise<{ erro: string }> {
  const usuario = await exigirAdmin();
  const area = texto(formData, "area", 20);
  const data = texto(formData, "data", 10);
  const titulo = texto(formData, "titulo", 4000);
  const observacao = texto(formData, "observacao", 20000);
  const conteudo = String(formData.get("conteudo") ?? "")
    .replaceAll("\u0000", "")
    .trim()
    .slice(0, 200000);
  const cumpridoBruto = texto(formData, "cumpridoPor", 12);
  const cumpridoEmBruto = texto(formData, "cumpridoEm", 16);
  const cumpridoEmInformado = cumpridoEmBruto
    ? instanteEscritorio(cumpridoEmBruto)
    : null;
  if (cumpridoEmBruto && !cumpridoEmInformado) {
    return { erro: "Informe a data e a hora em que foi cumprido." };
  }
  const ids = [
    ...new Set(
      formData
        .getAll("advogados")
        .map((valor) => Number(valor))
        .filter((valor) => Number.isInteger(valor) && valor > 0),
    ),
  ];

  if (!AREAS.has(area)) {
    return { erro: "Escolha a área do prazo." };
  }
  if (!dataIsoValida(data)) {
    return { erro: "Informe uma data válida." };
  }
  if (ehFimDeSemana(data)) {
    return { erro: "O prazo não cai em sábado nem domingo." };
  }
  if (!titulo) {
    return { erro: "Informe o prazo." };
  }
  if (ids.length === 0) {
    return { erro: "Escolha ao menos um advogado." };
  }

  const idBruto = texto(formData, "id", 12);
  const id = idBruto ? Number(idBruto) : null;
  if (idBruto && (!Number.isInteger(id) || (id ?? 0) <= 0)) {
    return { erro: "Esse prazo não está mais na lista." };
  }
  if (!id && data < hojeNoEscritorio()) {
    return { erro: "A data de um prazo novo é hoje ou um dia à frente." };
  }

  const mesesBruto = texto(formData, "meses", 3);
  const intervaloBruto = texto(formData, "intervalo", 3);
  const repetir = Boolean(mesesBruto || intervaloBruto);
  let meses = 0;
  let intervalo = 0;
  if (!id && repetir) {
    meses = Number(mesesBruto);
    intervalo = Number(intervaloBruto);
    if (
      !Number.isInteger(meses) ||
      meses < 1 ||
      meses > 24 ||
      !Number.isInteger(intervalo) ||
      intervalo < 1 ||
      intervalo > 180
    ) {
      return {
        erro: "Informe os meses (1 a 24) e o intervalo em dias (1 a 180), ou deixe os dois em branco.",
      };
    }
    if (cumpridoBruto) {
      return { erro: "A repetição vale para prazo em aberto." };
    }
  }

  const db = obterDb();
  let jaLigados = new Set<number>();
  if (id) {
    const vinculos = await db
      .select({ usuarioId: prazosUsuarios.usuarioId })
      .from(prazosUsuarios)
      .where(eq(prazosUsuarios.prazoId, id));
    jaLigados = new Set(vinculos.map((item) => item.usuarioId));
  }
  const escolhidos = await db
    .select({ id: usuarios.id, ativo: usuarios.ativo })
    .from(usuarios)
    .where(inArray(usuarios.id, ids));
  if (escolhidos.length !== ids.length) {
    return { erro: "Escolha advogados que existam no escritório." };
  }
  if (escolhidos.some((pessoa) => !pessoa.ativo && !jaLigados.has(pessoa.id))) {
    return { erro: "Escolha advogados ativos." };
  }

  let cumpridoPorId: number | null = null;
  if (cumpridoBruto) {
    cumpridoPorId = Number(cumpridoBruto);
    if (!Number.isInteger(cumpridoPorId) || cumpridoPorId <= 0) {
      return { erro: "Diga quem cumpriu." };
    }
    const [quem] = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.id, cumpridoPorId))
      .limit(1);
    if (!quem) {
      return { erro: "Diga quem cumpriu." };
    }
  }

  const situacao = cumpridoPorId ? "cumprido" : "aberto";
  const areaPrazo = area as "administrativo" | "civil" | "trabalhista";

  if (id) {
    const [atual] = await db
      .select({ id: prazos.id, data: prazos.data })
      .from(prazos)
      .where(eq(prazos.id, id))
      .limit(1);
    if (!atual) {
      return { erro: "Esse prazo não está mais na lista." };
    }
    const cumpridoEm =
      situacao === "cumprido" ? (cumpridoEmInformado ?? new Date()) : null;
    const avisos =
      atual.data === data
        ? []
        : linhasDeAviso({
            prazoId: id,
            titulo,
            dataAnterior: atual.data,
            dataNova: data,
            advogados: ids,
            atorId: usuario.id,
          });
    await db.transaction(async (tx) => {
      await tx
        .update(prazos)
        .set({
          area: areaPrazo,
          data,
          titulo,
          observacao,
          conteudo,
          defesa: formData.get("defesa") === "1",
          situacao,
          cumpridoPorId,
          cumpridoEm,
        })
        .where(eq(prazos.id, id));
      await tx.delete(prazosUsuarios).where(eq(prazosUsuarios.prazoId, id));
      await tx
        .insert(prazosUsuarios)
        .values(ids.map((usuarioId) => ({ prazoId: id, usuarioId })));
      if (avisos.length > 0) {
        await tx.insert(notificacoes).values(avisos);
      }
      await tx.insert(auditoria).values({
        atorId: usuario.id,
        acao: "atualizar",
        entidade: "prazos",
        entidadeId: String(id),
        detalhe: titulo.slice(0, 180),
      });
    });
    atualizarListas();
    redirect(`/admin/prazos/${id}?salvo=1`);
  }

  const serie = repetir ? datasRecorrentes(data, meses, intervalo) : null;
  if (serie?.estourou) {
    return {
      erro: "Essa repetição gera prazos demais. Encurte os meses ou aumente o intervalo.",
    };
  }
  const datas = serie?.datas.length ? serie.datas : [data];

  const criadoId = await db.transaction(async (tx) => {
    let primeiro: number | null = null;
    for (const dia of datas) {
      const [criado] = await tx
        .insert(prazos)
        .values({
          area: areaPrazo,
          data: dia,
          titulo,
          observacao,
          conteudo,
          defesa: formData.get("defesa") === "1",
          situacao,
          cumpridoPorId,
          cumpridoEm:
            situacao === "cumprido"
              ? (cumpridoEmInformado ?? new Date())
              : null,
        })
        .returning({ id: prazos.id });
      if (!criado) {
        continue;
      }
      primeiro ??= criado.id;
      await tx
        .insert(prazosUsuarios)
        .values(ids.map((usuarioId) => ({ prazoId: criado.id, usuarioId })));
    }
    if (!primeiro) {
      return null;
    }
    await tx.insert(auditoria).values({
      atorId: usuario.id,
      acao: "criar",
      entidade: "prazos",
      entidadeId: String(primeiro),
      detalhe:
        datas.length > 1
          ? `${datas.length} prazos, a cada ${intervalo} dias, por ${meses} meses`
          : titulo.slice(0, 180),
    });
    return primeiro;
  });

  if (!criadoId) {
    return { erro: "Não foi possível salvar o prazo." };
  }
  atualizarListas();
  redirect(
    datas.length > 1
      ? `/prazos?data=${data}&repetidos=${datas.length}`
      : `/prazos?data=${data}`,
  );
}

export async function cumprir(formData: FormData) {
  const usuario = await exigirUsuario();
  const id = Number(String(formData.get("id") ?? ""));
  const voltar = voltarDe(formData);
  if (!Number.isInteger(id) || id <= 0) {
    redirect(voltar);
  }

  const db = obterDb();
  const marcado = await db
    .update(prazos)
    .set({
      situacao: "cumprido",
      cumpridoPorId: usuario.id,
      cumpridoEm: new Date(),
    })
    .where(and(eq(prazos.id, id), eq(prazos.situacao, "aberto")))
    .returning({ id: prazos.id });
  if (marcado[0]) {
    await db.insert(auditoria).values({
      atorId: usuario.id,
      acao: "cumprir",
      entidade: "prazos",
      entidadeId: String(id),
    });
  }
  atualizarListas();
  redirect(voltar);
}

export async function desfazer(formData: FormData) {
  const usuario = await exigirAdmin();
  const id = Number(String(formData.get("id") ?? ""));
  const voltar = voltarDe(formData);
  if (!Number.isInteger(id) || id <= 0) {
    redirect(voltar);
  }

  const db = obterDb();
  const marcado = await db
    .update(prazos)
    .set({ situacao: "aberto", cumpridoPorId: null, cumpridoEm: null })
    .where(and(eq(prazos.id, id), eq(prazos.situacao, "cumprido")))
    .returning({ id: prazos.id });
  if (marcado[0]) {
    await db.insert(auditoria).values({
      atorId: usuario.id,
      acao: "desfazer",
      entidade: "prazos",
      entidadeId: String(id),
    });
  }
  atualizarListas();
  redirect(voltar);
}

export async function excluirPrazo(formData: FormData) {
  const usuario = await exigirAdmin();
  const id = Number(String(formData.get("id") ?? ""));
  const voltar = caminhoInterno(
    String(formData.get("voltar") ?? ""),
    "/admin/prazos",
  );
  if (!Number.isInteger(id) || id <= 0) {
    redirect(voltar);
  }

  const db = obterDb();
  const apagado = await db
    .delete(prazos)
    .where(eq(prazos.id, id))
    .returning({ id: prazos.id, titulo: prazos.titulo });
  if (apagado[0]) {
    await db.insert(auditoria).values({
      atorId: usuario.id,
      acao: "excluir",
      entidade: "prazos",
      entidadeId: String(id),
      detalhe: apagado[0].titulo.slice(0, 180),
    });
  }
  atualizarListas();
  redirect(
    voltar.includes("?") ? `${voltar}&excluido=1` : `${voltar}?excluido=1`,
  );
}
