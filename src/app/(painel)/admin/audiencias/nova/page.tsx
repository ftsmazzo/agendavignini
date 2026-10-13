import { connection } from "next/server";
import { Suspense } from "react";
import { FormularioAudiencia } from "@/components/formulario-audiencia";
import { listarPessoas } from "@/lib/pessoas";

export default function NovaAudiencia() {
  return (
    <Suspense
      fallback={<p className="text-xl text-muted">Abrindo o formulário.</p>}
    >
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await connection();
  const pessoas = await listarPessoas();
  return (
    <FormularioAudiencia
      responsaveis={pessoas.filter((pessoa) => pessoa.ativo)}
      advogados={[]}
    />
  );
}
