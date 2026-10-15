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
    <Suspense fallback={<p className="text-muted">Abrindo as pessoas.</p>}>
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
    <section className="entrada mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="titulo-pagina">Usuários</h1>
          <p className="subtitulo-pagina">
            Quem acessa a agenda e quem pode receber prazos.
          </p>
        </div>
        <Link href="/admin/usuarios/novo" className="btn btn-primario">
          Adicionar novo
        </Link>
      </div>
      {excluido ? (
        <output className="aviso aviso-ok mt-4 block">Usuário excluído.</output>
      ) : null}
      <div className="tabela-caixa mt-6">
        <table className="tabela">
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Usuário</th>
              <th scope="col">Grupo</th>
              <th scope="col">Ativo</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link
                    href={`/admin/usuarios/${item.id}`}
                    className="btn-texto"
                  >
                    {`${item.nome} ${item.sobrenome}`.trim()}
                  </Link>
                </td>
                <td>{item.login}</td>
                <td>
                  <span
                    className={
                      item.papel === "admin" ? "selo" : "selo selo-neutro"
                    }
                  >
                    {item.papel === "admin" ? "Administrador" : "Usuário"}
                  </span>
                </td>
                <td>
                  <span
                    className={item.ativo ? "selo selo-ok" : "selo selo-neutro"}
                  >
                    {item.ativo ? "Sim" : "Não"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
