import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { obterDb } from "@/db/client";
import { usuarios } from "@/db/schema";
import { lerSessao } from "@/lib/sessao";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sessao = await lerSessao();
  if (!sessao) {
    redirect("/entrar");
  }

  const db = obterDb();
  const [usuario] = await db
    .select({ papel: usuarios.papel })
    .from(usuarios)
    .where(eq(usuarios.id, sessao.id))
    .limit(1);

  if (usuario?.papel !== "admin") {
    redirect("/");
  }

  return children;
}
