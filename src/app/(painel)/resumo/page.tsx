import { eq } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { classeCampo } from "@/components/campo";
import { obterDb } from "@/db/client";
import { usuarios } from "@/db/schema";
import { exigirUsuario } from "@/lib/acesso";
import { hojeNoEscritorio } from "@/lib/contagens";
import { dataBr, dataHoraBr, dataIsoValida } from "@/lib/datas";
import { caixaConfigurada } from "@/lib/email";
import { listarPessoas } from "@/lib/pessoas";
import {
  assuntoDoDia,
  resumoDoDia,
  rotuloArea,
  statusDoPrazo,
  textoDoResumo,
} from "@/lib/resumo";

export default function Resumo({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; pessoa?: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-xl text-muted">Abrindo o resumo.</p>}
    >
      <Corpo searchParams={searchParams} />
    </Suspense>
  );
}

async function Corpo({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; pessoa?: string }>;
}) {
  const { dia: diaPedido, pessoa: pessoaPedida } = await searchParams;
  const usuario = await exigirUsuario();
  const hoje = hojeNoEscritorio();
  const dia = diaPedido && dataIsoValida(diaPedido) ? diaPedido : hoje;
  const pessoas = usuario.papel === "admin" ? await listarPessoas() : [];
  const escolhida = pessoas.find(
    (pessoa) => String(pessoa.id) === pessoaPedida && pessoa.ativo,
  );
  const alvoId = escolhida?.id ?? usuario.id;
  const db = obterDb();
  const [alvo] = await db
    .select({ nome: usuarios.nome, sobrenome: usuarios.sobrenome })
    .from(usuarios)
    .where(eq(usuarios.id, alvoId))
    .limit(1);
  const nome = alvo ? `${alvo.nome} ${alvo.sobrenome}`.trim() : "você";
  const resumo = await resumoDoDia(alvoId, dia);
  const vazio = resumo.audiencias.length === 0 && resumo.prazos.length === 0;

  return (
    <section className="mx-auto w-full max-w-5xl">
      <h1 className="text-4xl leading-tight font-bold text-ink">
        Resumo do dia
      </h1>
      <p className="mt-3 text-xl text-muted">
        {assuntoDoDia(dia).replace(" - Agenda Coelho Vignini", "")} · {nome}
      </p>
      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="dia" className="mb-2 block text-xl text-ink">
            Dia
          </label>
          <input
            id="dia"
            name="dia"
            type="date"
            defaultValue={dia}
            className={classeCampo}
          />
        </div>
        {usuario.papel === "admin" ? (
          <div>
            <label htmlFor="pessoa" className="mb-2 block text-xl text-ink">
              Pessoa
            </label>
            <select
              id="pessoa"
              name="pessoa"
              defaultValue={String(alvoId)}
              className={classeCampo}
            >
              {pessoas
                .filter((pessoa) => pessoa.ativo)
                .map((pessoa) => (
                  <option key={pessoa.id} value={pessoa.id}>
                    {pessoa.nome}
                  </option>
                ))}
            </select>
          </div>
        ) : null}
        <button
          type="submit"
          className="bg-pen px-4 py-3 text-lg font-semibold text-sheet"
        >
          Ver
        </button>
      </form>
      {vazio ? (
        <p className="mt-8 text-xl text-ink">
          Nada no nome de {nome} em {dataBr(dia)}. Audiências em que a pessoa
          está marcada e prazos em que ela é a responsável aparecem aqui.
        </p>
      ) : (
        <>
          {resumo.audiencias.length > 0 ? (
            <div className="mt-8">
              <h2 className="text-2xl font-semibold text-ink">
                Audiências ({resumo.audiencias.length})
              </h2>
              <ul className="mt-4 divide-y divide-line border border-line bg-sheet">
                {resumo.audiencias.map((item) => (
                  <li key={item.id} className="px-6 py-5">
                    <p className="text-lg text-muted">
                      {dataHoraBr(item.dataHora)}
                      {item.vara ? ` · ${item.vara}` : ""}
                      {item.local ? ` · ${item.local}` : ""}
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold text-ink">
                      {item.numeroProcesso || "Sem número"}
                    </h3>
                    <p className="mt-3 text-xl text-ink">
                      {[item.reclamante, item.reclamado]
                        .filter(Boolean)
                        .join(" · ") || "Partes não informadas"}
                    </p>
                    {item.preposto ? (
                      <p className="mt-2 text-lg text-muted">
                        Preposto: {item.preposto}
                      </p>
                    ) : null}
                    {item.observacao ? (
                      <p className="mt-3 text-xl whitespace-pre-wrap text-ink">
                        {item.observacao}
                      </p>
                    ) : null}
                    {usuario.papel === "admin" ? (
                      <Link
                        href={`/admin/audiencias/${item.id}`}
                        className="mt-4 inline-block text-lg text-pen"
                      >
                        Editar
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {resumo.prazos.length > 0 ? (
            <div className="mt-8">
              <h2 className="text-2xl font-semibold text-ink">
                Prazos ({resumo.prazos.length})
              </h2>
              <ul className="mt-4 divide-y divide-line border border-line bg-sheet">
                {resumo.prazos.map((item) => (
                  <li key={item.id} className="px-6 py-5">
                    <p className="text-lg text-muted">
                      {rotuloArea(item.area)} · {dataBr(item.data)} ·{" "}
                      {statusDoPrazo(item)}
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold text-ink">
                      {item.titulo}
                    </h3>
                    {item.conteudo ? (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-lg text-pen">
                          Ver publicação
                        </summary>
                        <p className="mt-3 text-lg whitespace-pre-wrap text-ink">
                          {item.conteudo}
                        </p>
                      </details>
                    ) : null}
                    {usuario.papel === "admin" ? (
                      <Link
                        href={`/admin/prazos/${item.id}`}
                        className="mt-4 inline-block text-lg text-pen"
                      >
                        Editar
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <details className="mt-8">
            <summary className="cursor-pointer text-lg text-pen">
              Texto do e-mail
            </summary>
            <pre className="mt-4 text-lg whitespace-pre-wrap text-ink">
              {textoDoResumo(nome, resumo)}
            </pre>
          </details>
        </>
      )}
      <p className="mt-8 text-lg text-muted">
        {caixaConfigurada()
          ? "Este texto também sai por e-mail de manhã para quem tem endereço e algo no nome."
          : "A caixa de e-mail do escritório ainda não está ligada neste servidor. Enquanto isso, o resumo fica nesta tela."}
      </p>
    </section>
  );
}
