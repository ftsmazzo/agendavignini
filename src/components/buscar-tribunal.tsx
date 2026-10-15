"use client";

import { useActionState } from "react";
import { buscarNoTribunal } from "@/app/(painel)/processo/actions";

function Bloco({ titulo, linhas }: { titulo: string; linhas: string[] }) {
  if (linhas.length === 0) {
    return null;
  }
  return (
    <div className="mt-4">
      <h2 className="text-lg font-semibold text-ink">{titulo}</h2>
      <ul className="mt-2 space-y-1 text-base text-ink">
        {linhas.map((linha) => (
          <li key={linha}>{linha}</li>
        ))}
      </ul>
    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  if (!valor) {
    return null;
  }
  return (
    <p className="mt-2 text-base text-ink">
      <span className="font-semibold">{rotulo}: </span>
      {valor}
    </p>
  );
}

export function BuscarTribunal({ numero }: { numero: string }) {
  const [estado, acao, pendente] = useActionState(buscarNoTribunal, null);
  const consulta = estado?.consulta;

  return (
    <form action={acao} className="cartao mt-6 p-5">
      <input type="hidden" name="numero" value={numero} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-muted">
          TJSP e TRT, 1º grau. A consulta gasta um crédito e não grava audiência
          nem prazo.
        </p>
        <button
          type="submit"
          disabled={pendente}
          className="btn btn-primario disabled:opacity-60"
        >
          {pendente ? "Consultando o tribunal." : "Buscar no tribunal"}
        </button>
      </div>
      {estado?.erro ? (
        <p role="alert" className="aviso aviso-erro mt-4">
          {estado.erro}
        </p>
      ) : null}
      {consulta ? (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-lg font-semibold text-ink">{consulta.fonte}</p>
          {consulta.preco ? (
            <p className="mt-1 text-base text-muted">
              Esta consulta custou {consulta.preco}.
            </p>
          ) : null}
          <Campo rotulo="Vara" valor={consulta.vara} />
          <Campo rotulo="Classe" valor={consulta.classe} />
          <Campo rotulo="Assunto" valor={consulta.assunto} />
          <Campo rotulo="Valor" valor={consulta.valor} />
          <Campo rotulo="Distribuição" valor={consulta.distribuicao} />
          <Bloco titulo="Partes" linhas={consulta.partes} />
          <Bloco titulo="Audiências" linhas={consulta.audiencias} />
          <Bloco titulo="Andamentos" linhas={consulta.andamentos} />
          {consulta.aviso ? (
            <p className="aviso mt-4">{consulta.aviso}</p>
          ) : null}
          {consulta.comprovante ? (
            <p className="mt-4">
              <a
                href={consulta.comprovante}
                target="_blank"
                rel="noreferrer"
                className="btn-texto"
              >
                Abrir o comprovante da consulta
              </a>
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
