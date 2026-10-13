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

export function agruparContatos(itens: ContatoLista[]) {
  const grupos: Array<{ letra: string; itens: ContatoLista[] }> = [];
  for (const item of itens) {
    const letra = item.nome.trim().charAt(0).toLocaleUpperCase("pt-BR") || "#";
    const ultimo = grupos.at(-1);
    if (!ultimo || ultimo.letra !== letra) {
      grupos.push({ letra, itens: [item] });
    } else {
      ultimo.itens.push(item);
    }
  }
  return grupos;
}
