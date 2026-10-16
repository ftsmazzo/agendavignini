import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormularioPrazo } from "@/components/formulario-prazo";
import { obterDb } from "@/db/client";
import { prazos, prazosUsuarios } from "@/db/schema";
import { hojeNoEscritorio } from "@/lib/contagens";
import { listarPessoas } from "@/lib/pessoas";
import { diaUtilSeguinte, ehDiaUtil } from "@/lib/publicacao";

export default function NovoPrazo({
  searchParams,
}: {
  searchParams: Promise<{ copia?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-muted">Abrindo o formulário.</p>}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}

function dataDaCopia(origem: string, hoje: string) {
  const seguinte = diaUtilSeguinte(origem);
  if (seguinte >= hoje) {
    return seguinte;
  }
  return ehDiaUtil(hoje) ? hoje : diaUtilSeguinte(hoje);
}

async function Conteudo({
  searchParams,
}: {
  searchParams: Promise<{ copia?: string }>;
}) {
  await connection();
  const { copia } = await searchParams;
  const id = Number(copia);
  const hoje = hojeNoEscritorio();
  const pessoas = await listarPessoas();
  const db = obterDb();
  const origem =
    Number.isInteger(id) && id > 0
      ? (await db.select().from(prazos).where(eq(prazos.id, id)).limit(1))[0]
      : undefined;
  const vinculos = origem
    ? await db
        .select({ usuarioId: prazosUsuarios.usuarioId })
        .from(prazosUsuarios)
        .where(eq(prazosUsuarios.prazoId, origem.id))
    : [];
  const advogados = vinculos.map((item) => item.usuarioId);
  const responsaveis = pessoas.filter(
    (pessoa) => pessoa.ativo || advogados.includes(pessoa.id),
  );

  return (
    <div>
      {origem ? (
        <output className="aviso aviso-ok mx-auto mb-6 block w-full max-w-3xl">
          Cópia pronta. Confira os campos e salve para gravar o prazo novo.
        </output>
      ) : null}
      <FormularioPrazo
        prazo={
          origem
            ? {
                area: origem.area,
                data: dataDaCopia(origem.data, hoje),
                titulo: origem.titulo,
                observacao: origem.observacao,
                conteudo: origem.conteudo,
                defesa: origem.defesa,
                cumpridoPorId: null,
                cumpridoEm: "",
              }
            : undefined
        }
        pessoas={pessoas}
        responsaveis={
          origem ? responsaveis : pessoas.filter((pessoa) => pessoa.ativo)
        }
        advogados={advogados}
        hoje={hoje}
      />
    </div>
  );
}
