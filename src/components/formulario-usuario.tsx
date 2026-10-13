"use client";

import { useActionState } from "react";
import {
  excluirUsuario,
  salvarUsuario,
} from "@/app/(painel)/admin/usuarios/actions";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Campo, classeCampo } from "@/components/campo";

export function FormularioUsuario({
  usuario,
  proprio,
}: {
  usuario?: {
    id: number;
    nome: string;
    sobrenome: string;
    email: string;
    celular: string;
    login: string;
    ativo: boolean;
    entraNoRelatorio: boolean;
    papel: string;
  };
  proprio: boolean;
}) {
  const [estado, acao, pendente] = useActionState(salvarUsuario, { erro: "" });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-4xl leading-tight font-bold text-ink">
        {usuario ? "Editar usuário" : "Adicionar usuário"}
      </h1>
      <form action={acao} className="mt-8 space-y-5">
        {usuario ? <input type="hidden" name="id" value={usuario.id} /> : null}
        <div className="grid gap-5 md:grid-cols-2">
          <Campo id="nome" rotulo="Nome">
            <input
              id="nome"
              name="nome"
              required
              defaultValue={usuario?.nome ?? ""}
              className={classeCampo}
            />
          </Campo>
          <Campo id="sobrenome" rotulo="Sobrenome">
            <input
              id="sobrenome"
              name="sobrenome"
              defaultValue={usuario?.sobrenome ?? ""}
              className={classeCampo}
            />
          </Campo>
          <Campo id="email" rotulo="E-mail">
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={usuario?.email ?? ""}
              className={classeCampo}
            />
          </Campo>
          <Campo id="celular" rotulo="Celular">
            <input
              id="celular"
              name="celular"
              defaultValue={usuario?.celular ?? ""}
              className={classeCampo}
            />
          </Campo>
          <Campo id="login" rotulo="Usuário">
            <input
              id="login"
              name="login"
              required
              autoComplete="off"
              defaultValue={usuario?.login ?? ""}
              className={classeCampo}
            />
          </Campo>
          <Campo id="senha" rotulo={usuario ? "Senha nova" : "Senha"}>
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="new-password"
              required={!usuario}
              minLength={usuario ? undefined : 8}
              placeholder={usuario ? "Em branco mantém a atual" : ""}
              className={classeCampo}
            />
          </Campo>
          <Campo id="ativo" rotulo="Ativo">
            <select
              id="ativo"
              name="ativo"
              defaultValue={usuario?.ativo === false ? "0" : "1"}
              disabled={proprio}
              className={classeCampo}
            >
              <option value="1">Sim</option>
              <option value="0">Não</option>
            </select>
          </Campo>
          <Campo id="relatorio" rotulo="Entra no relatório">
            <select
              id="relatorio"
              name="relatorio"
              defaultValue={usuario?.entraNoRelatorio ? "1" : "0"}
              className={classeCampo}
            >
              <option value="0">Não</option>
              <option value="1">Sim</option>
            </select>
          </Campo>
        </div>
        <Campo id="papel" rotulo="Grupo">
          <select
            id="papel"
            name="papel"
            defaultValue={usuario?.papel ?? "usuario"}
            disabled={proprio}
            className={classeCampo}
          >
            <option value="usuario">Usuário</option>
            <option value="admin">Administrador</option>
          </select>
        </Campo>
        {proprio ? (
          <>
            <input type="hidden" name="ativo" value="1" />
            <input type="hidden" name="papel" value="admin" />
          </>
        ) : null}
        {estado.erro ? (
          <p className="text-lg text-hearing" role="alert">
            {estado.erro}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pendente}
          className="w-full bg-pen px-4 py-3 text-xl font-bold text-sheet disabled:opacity-60"
        >
          {pendente ? "Salvando…" : "Salvar usuário"}
        </button>
      </form>
      {usuario && !proprio ? (
        <div className="mt-4">
          <BotaoExcluir
            action={excluirUsuario}
            pergunta="Excluir este usuário?"
            rotulo="Excluir usuário"
          >
            <input type="hidden" name="id" value={usuario.id} />
          </BotaoExcluir>
        </div>
      ) : null}
    </div>
  );
}
