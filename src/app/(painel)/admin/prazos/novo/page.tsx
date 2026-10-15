import { connection } from "next/server";
import { Suspense } from "react";
import { FormularioPrazo } from "@/components/formulario-prazo";
import { hojeNoEscritorio } from "@/lib/contagens";
import { listarPessoas } from "@/lib/pessoas";

export default function NovoPrazo() {
  return (
    <Suspense fallback={<p className="text-muted">Abrindo o formulário.</p>}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await connection();
  const pessoas = await listarPessoas();
  const responsaveis = pessoas.filter((pessoa) => pessoa.ativo);

  return (
    <FormularioPrazo
      pessoas={pessoas}
      responsaveis={responsaveis}
      advogados={[]}
      hoje={hojeNoEscritorio()}
    />
  );
}
