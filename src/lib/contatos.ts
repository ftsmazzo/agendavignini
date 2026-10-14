import { asc, ilike, or } from "drizzle-orm";
import { obterDb } from "@/db/client";
import { contatos } from "@/db/schema";

export type ContatoLista = {
  id: number;
  nome: string;
  telefone: string;
  celular: string | null;
  email: string | null;
  endereco: string | null;
  nascimento: string | null;
};

function padrao(termo: string) {
  const limpo = termo.replace(/[\\%_]/g, (caractere) => `\\${caractere}`);
  return `%${limpo}%`;
}

export async function buscarContatos(termo: string) {
  const q = termo.trim().slice(0, 80);
  const db = obterDb();
  const filtro = q
    ? or(
        ilike(contatos.nome, padrao(q)),
        ilike(contatos.telefone, padrao(q)),
        ilike(contatos.celular, padrao(q)),
        ilike(contatos.email, padrao(q)),
        ilike(contatos.endereco, padrao(q)),
      )
    : undefined;

  return db
    .select({
      id: contatos.id,
      nome: contatos.nome,
      telefone: contatos.telefone,
      celular: contatos.celular,
      email: contatos.email,
      endereco: contatos.endereco,
      nascimento: contatos.nascimento,
    })
    .from(contatos)
    .where(filtro)
    .orderBy(asc(contatos.nome));
}

export function numeroWhatsapp(
  celular: string | null | undefined,
  telefone: string | null | undefined,
) {
  for (const origem of [celular, telefone]) {
    for (const parte of partes(origem)) {
      const numero = normalizar(parte);
      if (numero) {
        return numero;
      }
    }
  }
  return null;
}

export function emailDeContato(email: string | null | undefined) {
  const texto = email?.trim() ?? "";
  if (
    !texto ||
    texto.length > 180 ||
    /\s/.test(texto) ||
    !texto.includes("@")
  ) {
    return null;
  }
  return texto;
}

function partes(valor: string | null | undefined) {
  return (valor ?? "")
    .split(/[/;,]|\s+e\s+|\s+ou\s+/i)
    .map((parte) => parte.replace(/\D/g, ""))
    .filter(Boolean);
}

function normalizar(bruto: string) {
  let numero = bruto.startsWith("00") ? bruto.slice(2) : bruto;
  if (numero.startsWith("0")) {
    numero = numero.replace(/^0+/, "");
  }
  if (
    numero.startsWith("55") &&
    (numero.length === 12 || numero.length === 13)
  ) {
    return numero;
  }
  if (numero.length === 10 || numero.length === 11) {
    return `55${numero}`;
  }
  return null;
}

export function agruparContatos(itens: ContatoLista[]) {
  const grupos: Array<{ letra: string; itens: ContatoLista[] }> = [];
  for (const item of itens) {
    const base = item.nome.trim().replace(/^[^0-9A-Za-zÀ-ÿ]+/, "");
    const letra = base.charAt(0).toLocaleUpperCase("pt-BR") || "#";
    const ultimo = grupos.at(-1);
    if (!ultimo || ultimo.letra !== letra) {
      grupos.push({ letra, itens: [item] });
    } else {
      ultimo.itens.push(item);
    }
  }
  return grupos;
}
