import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const NOME = "sessao";
const DOZE_HORAS = 60 * 60 * 12;

type Corpo = {
  id: number;
  exp: number;
};

function segredo() {
  const valor = process.env.SESSION_SECRET;
  if (!valor || valor.length < 32) {
    throw new Error("SESSION_SECRET ausente");
  }
  return valor;
}

function assinar(corpo: string) {
  return createHmac("sha256", segredo()).update(corpo).digest("base64url");
}

export async function gravarSessao(id: number) {
  const corpo = Buffer.from(
    JSON.stringify({ id, exp: Date.now() + DOZE_HORAS * 1000 } satisfies Corpo),
  ).toString("base64url");
  const jar = await cookies();
  jar.set(NOME, `${corpo}.${assinar(corpo)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DOZE_HORAS,
  });
}

export async function lerSessao() {
  const jar = await cookies();
  const token = jar.get(NOME)?.value;
  if (!token) {
    return null;
  }
  const ponto = token.lastIndexOf(".");
  if (ponto <= 0) {
    return null;
  }
  const corpo = token.slice(0, ponto);
  const assinatura = token.slice(ponto + 1);
  const esperada = assinar(corpo);
  const recebida = Buffer.from(assinatura);
  const calculada = Buffer.from(esperada);
  if (
    recebida.length !== calculada.length ||
    !timingSafeEqual(recebida, calculada)
  ) {
    return null;
  }

  try {
    const dados = JSON.parse(
      Buffer.from(corpo, "base64url").toString("utf8"),
    ) as Corpo;
    if (typeof dados.id !== "number" || dados.exp < Date.now()) {
      return null;
    }
    return { id: dados.id };
  } catch {
    return null;
  }
}

export async function apagarSessao() {
  const jar = await cookies();
  jar.delete(NOME);
}
