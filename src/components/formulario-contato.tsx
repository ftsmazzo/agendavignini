"use client";

import Link from "next/link";
import { useActionState } from "react";
import { excluirContato, salvarContato } from "@/app/(painel)/agenda/actions";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Campo, classeCampo } from "@/components/campo";
import { Seta } from "@/components/seta";

type ContatoFormulario = {
  id: number;
  nome: string;
  telefone: string;
  celular: string;
  email: string;
  endereco: string;
  nascimento: string;
};

export function FormularioContato({
  contato,
}: {
  contato?: ContatoFormulario;
}) {
  const [estado, acao, pendente] = useActionState(salvarContato, { erro: "" });

  return (
    <div className="entrada mx-auto w-full max-w-3xl">
      <Link href="/agenda" className="btn-texto">
        <Seta />
        Voltar à agenda
      </Link>
      <h1 className="titulo-pagina mt-2">
        {contato ? "Editar contato" : "Adicionar contato"}
      </h1>
      <p className="subtitulo-pagina">
        Nome e telefone de quem o escritório precisa encontrar rápido.
      </p>
      <form action={acao} className="cartao mt-6 space-y-5 p-5 md:p-7">
        {contato ? <input type="hidden" name="id" value={contato.id} /> : null}
        <Campo id="nome" rotulo="Nome">
          <input
            id="nome"
            name="nome"
            required
            defaultValue={contato?.nome ?? ""}
            className={classeCampo}
          />
        </Campo>
        <div className="grid gap-5 md:grid-cols-2">
          <Campo id="telefone" rotulo="Telefone">
            <input
              id="telefone"
              name="telefone"
              type="tel"
              defaultValue={contato?.telefone ?? ""}
              className={classeCampo}
            />
          </Campo>
          <Campo id="celular" rotulo="Celular">
            <input
              id="celular"
              name="celular"
              type="tel"
              defaultValue={contato?.celular ?? ""}
              className={classeCampo}
            />
          </Campo>
          <Campo id="email" rotulo="E-mail">
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={contato?.email ?? ""}
              className={classeCampo}
            />
          </Campo>
          <Campo id="nascimento" rotulo="Data de nascimento">
            <input
              id="nascimento"
              name="nascimento"
              type="date"
              defaultValue={contato?.nascimento ?? ""}
              className={classeCampo}
            />
          </Campo>
        </div>
        <Campo id="endereco" rotulo="Endereço">
          <input
            id="endereco"
            name="endereco"
            defaultValue={contato?.endereco ?? ""}
            className={classeCampo}
          />
        </Campo>
        {estado.erro ? (
          <p className="aviso aviso-erro" role="alert">
            {estado.erro}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pendente}
          className="btn btn-primario btn-cheio disabled:opacity-60"
        >
          {pendente ? "Salvando…" : "Salvar contato"}
        </button>
      </form>
      {contato ? (
        <div className="mt-4">
          <BotaoExcluir
            action={excluirContato}
            pergunta="Excluir este contato?"
            rotulo="Excluir contato"
          >
            <input type="hidden" name="id" value={contato.id} />
          </BotaoExcluir>
        </div>
      ) : null}
    </div>
  );
}
