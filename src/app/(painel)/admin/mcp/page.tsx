import { asc, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { revogarTokenMcp } from "@/app/(painel)/admin/mcp/actions";
import { BlocoConexao, FormularioTokenMcp } from "@/components/painel-mcp";
import { obterDb } from "@/db/client";
import { mcpTokens, usuarios } from "@/db/schema";
import { TOOLS_MCP } from "@/lib/mcp/catalogo";
import { SKILLS_MCP } from "@/lib/mcp/skills";

export default function PaginaMcp() {
  return (
    <Suspense fallback={<p className="text-muted">Abrindo a conexão IA.</p>}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await connection();
  const db = obterDb();
  const tokens = await db
    .select({
      id: mcpTokens.id,
      nome: mcpTokens.nome,
      prefixo: mcpTokens.prefixo,
      perfil: mcpTokens.perfil,
      ativo: mcpTokens.ativo,
      criadoEm: mcpTokens.criadoEm,
      ultimoUso: mcpTokens.ultimoUso,
      usoTotal: mcpTokens.usoTotal,
      usuarioId: mcpTokens.usuarioId,
      usuarioNome: usuarios.nome,
      usuarioSobrenome: usuarios.sobrenome,
    })
    .from(mcpTokens)
    .leftJoin(usuarios, eq(usuarios.id, mcpTokens.usuarioId))
    .orderBy(desc(mcpTokens.criadoEm));

  const pessoas = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      sobrenome: usuarios.sobrenome,
    })
    .from(usuarios)
    .where(eq(usuarios.ativo, true))
    .orderBy(asc(usuarios.nome), asc(usuarios.sobrenome));

  const cabecalhos = await headers();
  const host =
    cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host") ?? "";
  const proto = cabecalhos.get("x-forwarded-proto") ?? "https";
  const origem =
    process.env.APP_URL?.replace(/\/$/, "") ||
    (host
      ? `${proto}://${host}`
      : "https://agendavignini-app.kxryyk.easypanel.host");
  const urlMcp = `${origem}/mcp`;

  return (
    <section className="entrada mx-auto w-full max-w-5xl">
      <h1 className="titulo-pagina">Conectar IA</h1>
      <p className="subtitulo-pagina">
        MCP somente leitura para Claude, GPT e Manus. A IA consulta prazos e
        audiências; qualquer alteração continua no site, com pessoa logada.
      </p>

      <FormularioTokenMcp
        pessoas={pessoas.map((pessoa) => ({
          id: pessoa.id,
          nome: `${pessoa.nome} ${pessoa.sobrenome}`.trim(),
        }))}
      />

      <BlocoConexao urlMcp={urlMcp} />

      <div className="cartao mt-6 p-5">
        <h2 className="titulo-secao">Tokens</h2>
        {tokens.length === 0 ? (
          <p className="vazio mt-4">Nenhum token ainda.</p>
        ) : (
          <div className="tabela-caixa mt-4">
            <table className="tabela">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Prefixo</th>
                  <th scope="col">Perfil</th>
                  <th scope="col">Uso</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Ação</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.nome}
                      {item.usuarioNome ? (
                        <span className="mt-1 block text-sm text-muted">
                          {`${item.usuarioNome} ${item.usuarioSobrenome ?? ""}`.trim()}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <code>{item.prefixo}…</code>
                    </td>
                    <td>{item.perfil}</td>
                    <td>
                      {item.usoTotal}
                      {item.ultimoUso ? (
                        <span className="mt-1 block text-sm text-muted">
                          {new Intl.DateTimeFormat("pt-BR", {
                            timeZone: "America/Sao_Paulo",
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(item.ultimoUso)}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <span
                        className={`selo ${item.ativo ? "selo-ok" : "selo-neutro"}`}
                      >
                        {item.ativo ? "Ativo" : "Revogado"}
                      </span>
                    </td>
                    <td>
                      {item.ativo ? (
                        <form action={revogarTokenMcp}>
                          <input type="hidden" name="id" value={item.id} />
                          <button
                            type="submit"
                            className="btn btn-perigo btn-pequeno"
                          >
                            Revogar
                          </button>
                        </form>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="cartao mt-6 p-5">
        <h2 className="titulo-secao">Skills para o Claude</h2>
        <p className="mt-1 text-sm text-muted">
          Baixe o arquivo e inclua no projeto de Skills do Claude (ou cole o
          conteúdo numa Skill nova). Elas ensinam a usar este MCP.
        </p>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {SKILLS_MCP.map((skill) => (
            <li key={skill.id} className="rounded-xl border border-line p-4">
              <p className="font-semibold text-ink">{skill.titulo}</p>
              <p className="mt-1 text-sm text-muted">{skill.resumo}</p>
              <a
                href={`/admin/mcp/skills/${skill.arquivo}`}
                className="btn btn-pequeno mt-3"
                download={skill.arquivo}
              >
                Baixar {skill.arquivo}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="cartao mt-6 p-5">
        <h2 className="titulo-secao">Tools disponíveis ({TOOLS_MCP.length})</h2>
        <ul className="mt-4 space-y-3">
          {TOOLS_MCP.map((tool) => (
            <li key={tool.name}>
              <p className="font-semibold text-ink">
                <code>{tool.name}</code>
              </p>
              <p className="text-sm text-muted">{tool.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
