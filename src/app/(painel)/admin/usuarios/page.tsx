import { asc } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { obterDb } from "@/db/client";
import { usuarios } from "@/db/schema";

export default function ListarUsuarios({
  searchParams,
}: {
  searchParams: Promise<{ excluido?: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-xl text-muted">Abrindo as pessoas.</p>}
    >
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

async function Lista({
  searchParams,
}: {
  searchParams: Promise<{ excluido?: string }>;
}) {
  await connection();
  const { excluido } = await searchParams;
  const db = obterDb();
  const itens = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      sobrenome: usuarios.sobrenome,
      login: usuarios.login,
      papel: usuarios.papel,
      ativo: usuarios.ativo,
    })
    .from(usuarios)
    .orderBy(asc(usuarios.nome), asc(usuarios.sobrenome));

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl leading-tight font-bold text-ink">Usuários</h1>
        <Link
          href="/admin/usuarios/novo"
          className="bg-pen px-4 py-3 text-lg font-semibold text-sheet"
        >
          Adicionar novo
        </Link>
      </div>
      {excluido ? (
        <output className="mt-4 block text-xl text-done">
          Usuário excluído.
        </output>
      ) : null}
      <div className="mt-6 overflow-x-auto border border-line bg-sheet">
        <table className="w-full border-collapse text-left text-xl">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Usuário</th>
              <th className="px-4 py-3 font-semibold">Grupo</th>
              <th className="px-4 py-3 font-semibold">Ativo</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr
                key={item.id}
                className="border-b border-line last:border-b-0"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/usuarios/${item.id}`}
                    className="text-pen underline"
                  >
                    {`${item.nome} ${item.sobrenome}`.trim()}
                  </Link>
                </td>
                <td className="px-4 py-3">{item.login}</td>
                <td className="px-4 py-3">
                  {item.papel === "admin" ? "Administrador" : "Usuário"}
                </td>
                <td className="px-4 py-3">{item.ativo ? "Sim" : "Não"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
