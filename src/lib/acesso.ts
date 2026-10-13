import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { obterDb } from "@/db/client";
import { usuarios } from "@/db/schema";
import { lerSessao } from "@/lib/sessao";

export async function exigirUsuario() {
  const sessao = await lerSessao();
  if (!sessao) {
    redirect("/entrar");
  }

  const db = obterDb();
  const [usuario] = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      papel: usuarios.papel,
      ativo: usuarios.ativo,
    })
    .from(usuarios)
    .where(eq(usuarios.id, sessao.id))
    .limit(1);

  if (!usuario?.ativo) {
    redirect("/entrar");
  }

  return usuario;
}

export async function exigirAdmin() {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "admin") {
    redirect("/");
  }
  return usuario;
}
