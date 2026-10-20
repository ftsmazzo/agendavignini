#!/usr/bin/env node
/**
 * Ponte MCP stdio → HTTP da Agenda.
 * O Claude Desktop não aceita "headers" em servidor remoto;
 * esta ponte injeta Authorization e fala o protocolo MCP no stdio.
 *
 * Env:
 *   MCP_REMOTE_URL  ex.: https://agendavignini-app.kxryyk.easypanel.host/mcp
 *   MCP_TOKEN       token criado em Admin → Conectar IA
 */
import { createInterface } from "node:readline";

const url = (process.env.MCP_REMOTE_URL || "").trim().replace(/\/$/, "");
const token = (process.env.MCP_TOKEN || "").trim();

function write(msg) {
  process.stdout.write(`${JSON.stringify(msg)}\n`);
}

function reply(id, result) {
  write({ jsonrpc: "2.0", id: id ?? null, result });
}

function fail(id, code, message) {
  write({
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message },
  });
}

async function remoto(body) {
  if (!url || !token) {
    throw new Error("Defina MCP_REMOTE_URL e MCP_TOKEN no ambiente.");
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Api-Key": token,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 202) {
    return null;
  }
  const texto = await res.text();
  let json;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new Error(`Resposta inválida (${res.status}): ${texto.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(json.erro || json.error?.message || `HTTP ${res.status}`);
  }
  return json;
}

async function handle(msg) {
  const method = msg.method || "";
  const id = msg.id;
  const params = msg.params || {};

  if (method === "notifications/initialized" || id === undefined) {
    if (method === "notifications/initialized") {
      return;
    }
  }

  if (method === "initialize") {
    reply(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: {
        name: "agenda-coelho-vignini",
        version: "1.0.0",
      },
      instructions:
        "MCP somente leitura da Agenda Coelho Vignini. Não grava nem cumpre prazo.",
    });
    return;
  }

  if (method === "ping") {
    reply(id, {});
    return;
  }

  try {
    const remotoRes = await remoto({
      jsonrpc: "2.0",
      id: id ?? 1,
      method,
      params,
    });
    if (remotoRes === null) {
      return;
    }
    if (remotoRes.result !== undefined) {
      reply(id, remotoRes.result);
      return;
    }
    if (remotoRes.error) {
      fail(id, remotoRes.error.code ?? -32000, remotoRes.error.message);
      return;
    }
    // Resposta fina (sem envelope jsonrpc)
    reply(id, remotoRes);
  } catch (erro) {
    fail(id, -32000, erro instanceof Error ? erro.message : String(erro));
  }
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (linha) => {
  const texto = linha.trim();
  if (!texto) {
    return;
  }
  let msg;
  try {
    msg = JSON.parse(texto);
  } catch {
    fail(null, -32700, "JSON inválido");
    return;
  }
  handle(msg);
});
