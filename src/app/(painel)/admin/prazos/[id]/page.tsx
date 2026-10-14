import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormularioPrazo } from "@/components/formulario-prazo";
import { obterDb } from "@/db/client";
import { prazos, prazosUsuarios } from "@/db/schema";
import { hojeNoEscritorio } from "@/lib/contagens";
import { paraCampoDataHora } from "@/lib/datas";
import { listarPessoas } from "@/lib/pessoas";

export default function EditarPrazo({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-xl text-muted">Abrindo o prazo.</p>}>
      <Editor params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Editor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string }>;
}) {
  const { id: idBruto } = await params;
  const { salvo } = await searchParams;
  const id = Number(idBruto);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const db = obterDb();
  const [prazo] = await db
    .select()
    .from(prazos)
    .where(eq(prazos.id, id))
    .limit(1);
  if (!prazo) {
    notFound();
  }

  const vinculos = await db
    .select({ usuarioId: prazosUsuarios.usuarioId })
    .from(prazosUsuarios)
    .where(eq(prazosUsuarios.prazoId, id));
  const advogados = vinculos.map((item) => item.usuarioId);
  const pessoas = await listarPessoas();
  const responsaveis = pessoas.filter(
    (pessoa) => pessoa.ativo || advogados.includes(pessoa.id),
  );

  return (
    <div>
      {salvo ? (
        <output className="mx-auto mb-6 block w-full max-w-3xl text-xl text-done">
          Prazo salvo.
        </output>
      ) : null}
      <FormularioPrazo
        prazo={{
          id: prazo.id,
          area: prazo.area,
          data: prazo.data,
          titulo: prazo.titulo,
          observacao: prazo.observacao,
          conteudo: prazo.conteudo,
          cumpridoPorId: prazo.cumpridoPorId,
          cumpridoEm: prazo.cumpridoEm
            ? paraCampoDataHora(prazo.cumpridoEm)
            : "",
        }}
        pessoas={pessoas}
        responsaveis={responsaveis}
        advogados={advogados}
        hoje={hojeNoEscritorio()}
      />
    </div>
  );
}
