import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormularioUsuario } from "@/components/formulario-usuario";
import { obterDb } from "@/db/client";
import { usuarios } from "@/db/schema";
import { exigirAdmin } from "@/lib/acesso";

const AVISO: Record<string, string> = {
  vinculo: "Esta pessoa tem prazos ou audiências. Desative em vez de excluir.",
  proprio: "O seu próprio acesso não pode ser excluído.",
};

export default function EditarUsuario({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string; erro?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-muted">Abrindo a pessoa.</p>}>
      <Editor params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Editor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string; erro?: string }>;
}) {
  const ator = await exigirAdmin();
  const { id: idBruto } = await params;
  const { salvo, erro } = await searchParams;
  const id = Number(idBruto);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }
  const db = obterDb();
  const [usuario] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);
  if (!usuario) {
    notFound();
  }

  return (
    <div>
      {salvo ? (
        <output className="aviso aviso-ok mx-auto mb-6 block w-full max-w-3xl">
          Usuário salvo.
        </output>
      ) : null}
      {erro && AVISO[erro] ? (
        <p
          className="aviso aviso-erro mx-auto mb-6 w-full max-w-3xl"
          role="alert"
        >
          {AVISO[erro]}
        </p>
      ) : null}
      <FormularioUsuario
        proprio={usuario.id === ator.id}
        usuario={{
          id: usuario.id,
          nome: usuario.nome,
          sobrenome: usuario.sobrenome,
          email: usuario.email ?? "",
          celular: usuario.celular ?? "",
          login: usuario.login,
          ativo: usuario.ativo,
          entraNoRelatorio: usuario.entraNoRelatorio,
          papel: usuario.papel,
        }}
      />
    </div>
  );
}
