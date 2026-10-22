import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { Suspense } from "react";
import { marcarAvisosLidos } from "@/app/(painel)/conta/actions";
import { FormularioConta } from "@/components/formulario-conta";
import { obterDb } from "@/db/client";
import { usuarios } from "@/db/schema";
import { exigirUsuario } from "@/lib/acesso";
import { listarAvisos } from "@/lib/avisos";
import { dataBr, dataHoraBr } from "@/lib/datas";

export default function Conta() {
  return (
    <Suspense fallback={<p className="text-muted">Abrindo a conta.</p>}>
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
  const avisos = await listarAvisos(sessao.id);
  const pendentes = avisos.filter((item) => !item.lida).length;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="titulo-pagina">Alterar dados</h1>
      <p className="subtitulo-pagina">
        Seus dados de contato, a senha de acesso e os avisos de prazo.
      </p>
      <section className="mt-8">
        <h2 className="titulo-secao">Avisos de prazo</h2>
        <p className="mt-2 text-base text-muted">
          Quando a data de um prazo seu muda, a data antiga e a nova ficam aqui.
        </p>
        {pendentes > 0 ? (
          <form action={marcarAvisosLidos} className="mt-4">
            <button type="submit" className="btn">
              Marcar como lidos
            </button>
          </form>
        ) : null}
        {avisos.length === 0 ? (
          <p className="vazio mt-6">Nenhum aviso por enquanto.</p>
        ) : (
          <ul className="lista-cartoes mt-6">
            {avisos.map((item) => (
              <li
                key={item.id}
                className={`px-4 py-3 ${item.lida ? "" : "bg-pen-soft"}`}
              >
                <p className="font-semibold text-ink">{item.titulo}</p>
                <p className="mt-1 text-base text-ink">
                  {dataBr(item.dataAnterior)} passou para{" "}
                  {dataBr(item.dataNova)}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {dataHoraBr(item.criadaEm)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <FormularioConta
        usuario={{
          nome: usuario.nome,
          sobrenome: usuario.sobrenome,
          email: usuario.email ?? "",
          celular: usuario.celular ?? "",
          login: usuario.login,
        }}
      />
    </div>
  );
}
