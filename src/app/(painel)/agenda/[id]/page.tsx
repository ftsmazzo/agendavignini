import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormularioContato } from "@/components/formulario-contato";
import { obterDb } from "@/db/client";
import { contatos } from "@/db/schema";

export default function EditarAgenda({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-muted">Abrindo o contato.</p>}>
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
  const [contato] = await db
    .select()
    .from(contatos)
    .where(eq(contatos.id, id))
    .limit(1);
  if (!contato) {
    notFound();
  }

  return (
    <div>
      {salvo ? (
        <output className="aviso aviso-ok mx-auto mb-6 block w-full max-w-3xl">
          Contato salvo.
        </output>
      ) : null}
      <FormularioContato
        contato={{
          id: contato.id,
          nome: contato.nome,
          telefone: contato.telefone,
          celular: contato.celular ?? "",
          email: contato.email ?? "",
          endereco: contato.endereco ?? "",
          nascimento: contato.nascimento ?? "",
        }}
      />
    </div>
  );
}
