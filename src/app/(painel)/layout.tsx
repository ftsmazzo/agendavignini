import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { Casca } from "@/components/casca";
import { obterDb } from "@/db/client";
import { usuarios } from "@/db/schema";
import { lerSessao } from "@/lib/sessao";

export default function PainelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={<p className="px-8 py-10 text-muted">Abrindo a agenda.</p>}
    >
      <PainelAutenticado>{children}</PainelAutenticado>
    </Suspense>
  );
}

async function PainelAutenticado({ children }: { children: ReactNode }) {
  const sessao = await lerSessao();
  if (!sessao) {
    redirect("/entrar");
  }

  const db = obterDb();
  const [usuario] = await db
    .select({
      nome: usuarios.nome,
      sobrenome: usuarios.sobrenome,
      papel: usuarios.papel,
      ativo: usuarios.ativo,
    })
    .from(usuarios)
    .where(eq(usuarios.id, sessao.id))
    .limit(1);

  if (!usuario?.ativo) {
    redirect("/entrar");
  }

  const nome = `${usuario.nome} ${usuario.sobrenome}`.trim();
  return (
    <Casca usuario={{ nome, admin: usuario.papel === "admin" }}>
      {children}
    </Casca>
  );
}
