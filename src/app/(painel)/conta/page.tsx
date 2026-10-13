import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormularioConta } from "@/components/formulario-conta";
import { obterDb } from "@/db/client";
import { usuarios } from "@/db/schema";
import { exigirUsuario } from "@/lib/acesso";

export default function Conta() {
  return (
    <Suspense fallback={<p className="text-xl text-muted">Abrindo a conta.</p>}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await connection();
  const sessao = await exigirUsuario();
  const db = obterDb();
  const [usuario] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.id, sessao.id))
    .limit(1);
  if (!usuario) {
    return null;
  }

  return (
    <FormularioConta
      usuario={{
        nome: usuario.nome,
        sobrenome: usuario.sobrenome,
        email: usuario.email ?? "",
        celular: usuario.celular ?? "",
        login: usuario.login,
      }}
    />
  );
}
