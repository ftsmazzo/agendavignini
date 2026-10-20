"use client";

import { useActionState, useState } from "react";
import { criarTokenMcp } from "@/app/(painel)/admin/mcp/actions";

export function FormularioTokenMcp({
  pessoas,
}: {
  pessoas: Array<{ id: number; nome: string }>;
}) {
  const [estado, acao, pendente] = useActionState(criarTokenMcp, {
    erro: "",
    token: "",
  });
  const [perfil, setPerfil] = useState("escritorio");

  return (
    <div className="cartao mt-6 p-5">
      <h2 className="titulo-secao">Criar token</h2>
      <p className="mt-1 text-sm text-muted">
        O valor completo aparece uma vez. Guarde no Claude ou no gerenciador de
        senhas do escritório.
      </p>
      <form action={acao} className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="nome" className="rotulo-campo">
            Nome do token
          </label>
          <input
            id="nome"
            name="nome"
            required
            placeholder="Claude do escritório"
            className="campo"
          />
        </div>
        <div>
          <label htmlFor="perfil" className="rotulo-campo">
            Perfil
          </label>
          <select
            id="perfil"
            name="perfil"
            className="campo"
            value={perfil}
            onChange={(evento) => setPerfil(evento.target.value)}
          >
            <option value="escritorio">Escritório (agenda toda)</option>
            <option value="pessoal">Pessoal (só o vinculado)</option>
          </select>
        </div>
        <div>
          <label htmlFor="usuario_id" className="rotulo-campo">
            Advogado (se pessoal)
          </label>
          <select
            id="usuario_id"
            name="usuario_id"
            className="campo"
            disabled={perfil !== "pessoal"}
            required={perfil === "pessoal"}
          >
            <option value="">Sem vínculo</option>
            {pessoas.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pendente}
            className="btn btn-primario disabled:opacity-60"
          >
            {pendente ? "Criando." : "Criar token"}
          </button>
        </div>
      </form>
      {estado.erro ? (
        <p className="aviso aviso-erro mt-4" role="alert">
          {estado.erro}
        </p>
      ) : null}
      {estado.token ? (
        <div className="aviso aviso-ok mt-4">
          <p className="font-semibold">Token criado. Copie agora:</p>
          <CopiarTexto valor={estado.token} />
        </div>
      ) : null}
    </div>
  );
}

function CopiarTexto({ valor }: { valor: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="mt-2 flex flex-wrap items-start gap-2">
      <pre className="max-w-full flex-1 overflow-x-auto rounded-lg bg-paper p-3 text-sm break-all text-ink">
        {valor}
      </pre>
      <button
        type="button"
        className="btn btn-pequeno"
        onClick={async () => {
          await navigator.clipboard.writeText(valor);
          setOk(true);
          window.setTimeout(() => setOk(false), 2000);
        }}
      >
        {ok ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

export function BlocoConexao({ urlMcp }: { urlMcp: string }) {
  const token = "COLE_O_TOKEN_AQUI";
  const caminhoPonte =
    "C:\\Users\\anjo_\\OneDrive\\Projetos-FabriaIA\\agendavignini\\scripts\\mcp-stdio.mjs";

  // Claude Desktop NÃO aceita "headers" em servidor url/remoto.
  // Usa ponte stdio local (igual Inteligência Eleitoral).
  const claudeDesktop = JSON.stringify(
    {
      mcpServers: {
        "agenda-coelho-vignini": {
          command: "node",
          args: [caminhoPonte],
          env: {
            MCP_REMOTE_URL: urlMcp,
            MCP_TOKEN: token,
          },
        },
      },
    },
    null,
    2,
  );

  const claudeDesktopNpx = JSON.stringify(
    {
      mcpServers: {
        "agenda-coelho-vignini": {
          command: "npx",
          args: [
            "-y",
            "mcp-remote@latest",
            urlMcp,
            "--header",
            `Authorization: Bearer ${token}`,
            "--header",
            `X-Api-Key: ${token}`,
          ],
        },
      },
    },
    null,
    2,
  );

  const claudeWeb = `URL do conector: ${urlMcp}

Cabeçalho (nome exato):
x-api-key

Valor:
${token}

Se a tela pedir "authorization", use o valor:
Bearer ${token}`;

  const cursor = JSON.stringify(
    {
      mcpServers: {
        "agenda-coelho-vignini": {
          url: urlMcp,
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Api-Key": token,
          },
        },
      },
    },
    null,
    2,
  );

  const generico = `POST ${urlMcp}
Authorization: Bearer ${token}
X-Api-Key: ${token}
Content-Type: application/json

{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"teste","version":"1.0.0"}}}`;

  return (
    <div className="cartao mt-6 space-y-6 p-5">
      <div>
        <h2 className="titulo-secao">Conexão</h2>
        <p className="mt-1 text-sm text-muted">
          O Claude Desktop não aceita o campo{" "}
          <code className="text-ink">headers</code> em MCP remoto. Use a ponte
          stdio abaixo (recomendado) ou o conector web com o cabeçalho{" "}
          <code className="text-ink">x-api-key</code>.
        </p>
        <p className="mt-2 text-sm font-semibold text-ink">{urlMcp}</p>
      </div>

      <div>
        <h3 className="font-semibold text-ink">
          Claude Desktop (recomendado — ponte stdio)
        </h3>
        <p className="mt-1 text-sm text-muted">
          Cole em <code>claude_desktop_config.json</code>. Troque o token e, se
          precisar, o caminho do arquivo <code>mcp-stdio.mjs</code>.
        </p>
        <CopiarTexto valor={claudeDesktop} />
      </div>

      <div>
        <h3 className="font-semibold text-ink">
          Claude Desktop (alternativa npx mcp-remote)
        </h3>
        <CopiarTexto valor={claudeDesktopNpx} />
      </div>

      <div>
        <h3 className="font-semibold text-ink">
          Claude.ai (conector customizado)
        </h3>
        <p className="mt-1 text-sm text-muted">
          Em Request headers, o nome do cabeçalho tem que ser{" "}
          <strong>x-api-key</strong> (não “Authorization”).
        </p>
        <CopiarTexto valor={claudeWeb} />
      </div>

      <div>
        <h3 className="font-semibold text-ink">Cursor</h3>
        <CopiarTexto valor={cursor} />
      </div>

      <div>
        <h3 className="font-semibold text-ink">GPT / Manus / HTTP</h3>
        <CopiarTexto valor={generico} />
      </div>
    </div>
  );
}
