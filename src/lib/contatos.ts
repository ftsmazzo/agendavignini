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

type NumeroMarcado = {
  id: string;
  texto: string;
  whatsapp: string | null;
};

export function numerosDoContato(
  celular: string | null | undefined,
  telefone: string | null | undefined,
) {
  const vistos = new Set<string>();
  const saida: NumeroMarcado[] = [];
  for (const origem of [celular, telefone]) {
    for (const pedaco of separar(origem)) {
      const achados = extrair(pedaco);
      if (achados.length === 0) {
        saida.push({
          id: `texto-${saida.length}`,
          texto: pedaco,
          whatsapp: null,
        });
        continue;
      }
      if (achados.length === 1) {
        const whatsapp = achados[0];
        if (!whatsapp || vistos.has(whatsapp)) {
          continue;
        }
        vistos.add(whatsapp);
        saida.push({ id: whatsapp, texto: pedaco, whatsapp });
        continue;
      }
      for (const whatsapp of achados) {
        if (vistos.has(whatsapp)) {
          continue;
        }
        vistos.add(whatsapp);
        saida.push({ id: whatsapp, texto: formatar(whatsapp), whatsapp });
      }
    }
  }
  return saida;
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

const DDD_INVALIDO = new Set([
  20, 23, 25, 26, 29, 30, 36, 39, 40, 50, 52, 56, 57, 58, 59, 60, 70, 72, 76,
  78, 80, 90,
]);

function separar(valor: string | null | undefined) {
  return (valor ?? "")
    .split(/\s*(?:\/|;|\||,|\be\b|\bou\b|ramal|r\.)\s*/i)
    .map((parte) => parte.trim())
    .filter(Boolean);
}

function dddValido(ddd: string) {
  const numero = Number(ddd);
  return numero >= 11 && numero <= 99 && !DDD_INVALIDO.has(numero);
}

function extrair(texto: string) {
  const digitos = texto.replace(/\D/g, "").replace(/^00/, "");
  const numeros: string[] = [];
  let indice = 0;
  while (indice < digitos.length) {
    if (digitos[indice] === "0") {
      indice += 1;
      continue;
    }
    const achado = tentar(digitos.slice(indice));
    if (!achado) {
      indice += 1;
      continue;
    }
    numeros.push(achado.whatsapp);
    indice += achado.consumidos;
  }
  return numeros;
}

function tentar(resto: string) {
  const opcoes: Array<{ whatsapp: string; consumidos: number }> = [];
  if (resto.startsWith("55") && resto.length >= 12) {
    const corpo = resto.slice(2);
    if (
      corpo.length >= 11 &&
      corpo[2] === "9" &&
      dddValido(corpo.slice(0, 2))
    ) {
      opcoes.push({ whatsapp: `55${corpo.slice(0, 11)}`, consumidos: 13 });
    } else if (
      corpo.length >= 10 &&
      corpo[2] !== "9" &&
      dddValido(corpo.slice(0, 2))
    ) {
      opcoes.push({ whatsapp: `55${corpo.slice(0, 10)}`, consumidos: 12 });
    }
  }
  if (resto.length >= 11 && resto[2] === "9" && dddValido(resto.slice(0, 2))) {
    opcoes.push({ whatsapp: `55${resto.slice(0, 11)}`, consumidos: 11 });
  }
  if (resto.length >= 10 && resto[2] !== "9" && dddValido(resto.slice(0, 2))) {
    opcoes.push({ whatsapp: `55${resto.slice(0, 10)}`, consumidos: 10 });
  }
  opcoes.sort((a, b) => b.consumidos - a.consumidos);
  return opcoes[0] ?? null;
}

function formatar(whatsapp: string) {
  const corpo = whatsapp.slice(2);
  const ddd = corpo.slice(0, 2);
  const resto = corpo.slice(2);
  if (resto.length === 9) {
    return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`;
  }
  return `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`;
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
