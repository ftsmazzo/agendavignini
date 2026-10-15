import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormularioAudiencia } from "@/components/formulario-audiencia";
import { obterDb } from "@/db/client";
import { audiencias, audienciasUsuarios } from "@/db/schema";
import { paraCampoDataHora } from "@/lib/datas";
import { listarPessoas } from "@/lib/pessoas";

export default function EditarAudiencia({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-muted">Abrindo a audiência.</p>}>
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
  const [audiencia] = await db
    .select()
    .from(audiencias)
    .where(eq(audiencias.id, id))
    .limit(1);
  if (!audiencia) {
    notFound();
  }
  const vinculos = await db
    .select({ usuarioId: audienciasUsuarios.usuarioId })
    .from(audienciasUsuarios)
    .where(eq(audienciasUsuarios.audienciaId, id));
  const advogados = vinculos.map((item) => item.usuarioId);
  const pessoas = await listarPessoas();

  return (
    <div>
      {salvo ? (
        <output className="aviso aviso-ok mx-auto mb-6 block w-full max-w-3xl">
          Audiência salva.
        </output>
      ) : null}
      <FormularioAudiencia
        audiencia={{
          id: audiencia.id,
          numeroProcesso: audiencia.numeroProcesso,
          vara: audiencia.vara,
          local: audiencia.local,
          reclamante: audiencia.reclamante ?? "",
          reclamado: audiencia.reclamado ?? "",
          preposto: audiencia.preposto ?? "",
          dataHora: paraCampoDataHora(audiencia.dataHora),
          observacao: audiencia.observacao ?? "",
        }}
        responsaveis={pessoas.filter(
          (pessoa) => pessoa.ativo || advogados.includes(pessoa.id),
        )}
        advogados={advogados}
      />
    </div>
  );
}
