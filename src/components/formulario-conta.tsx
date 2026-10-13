"use client";

import { useActionState } from "react";
import { salvarDados, salvarSenha } from "@/app/(painel)/conta/actions";
import { Campo, classeCampo } from "@/components/campo";

export function FormularioConta({
  usuario,
}: {
  usuario: {
    nome: string;
    sobrenome: string;
    email: string;
    celular: string;
    login: string;
  };
}) {
  const [dados, acaoDados, pendenteDados] = useActionState(salvarDados, {
    erro: "",
    ok: "",
  });
  const [senha, acaoSenha, pendenteSenha] = useActionState(salvarSenha, {
    erro: "",
    ok: "",
  });

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-2">
      <section>
        <h1 className="text-4xl leading-tight font-bold text-ink">
          Alterar dados
        </h1>
        <form action={acaoDados} className="mt-8 space-y-5">
          <Campo id="nome" rotulo="Nome">
            <input
              id="nome"
              name="nome"
              required
              defaultValue={usuario.nome}
              className={classeCampo}
            />
          </Campo>
          <Campo id="sobrenome" rotulo="Sobrenome">
            <input
              id="sobrenome"
              name="sobrenome"
              defaultValue={usuario.sobrenome}
              className={classeCampo}
            />
          </Campo>
          <Campo id="email" rotulo="E-mail">
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={usuario.email}
              className={classeCampo}
            />
          </Campo>
          <Campo id="celular" rotulo="Celular">
            <input
              id="celular"
              name="celular"
              defaultValue={usuario.celular}
              className={classeCampo}
            />
          </Campo>
          <Campo id="login" rotulo="Usuário">
            <input
              id="login"
              name="login"
              required
              autoComplete="username"
              defaultValue={usuario.login}
              className={classeCampo}
            />
          </Campo>
          {dados.erro ? (
            <p className="text-lg text-hearing" role="alert">
              {dados.erro}
            </p>
          ) : null}
          {dados.ok ? (
            <output className="block text-xl text-done">{dados.ok}</output>
          ) : null}
          <button
            type="submit"
            disabled={pendenteDados}
            className="w-full bg-pen px-4 py-3 text-xl font-bold text-sheet disabled:opacity-60"
          >
            {pendenteDados ? "Salvando…" : "Salvar dados"}
          </button>
        </form>
      </section>
      <section>
        <h2 className="text-4xl leading-tight font-bold text-ink">
          Alterar senha
        </h2>
        <form action={acaoSenha} className="mt-8 space-y-5">
          <Campo id="senhaAtual" rotulo="Senha atual">
            <input
              id="senhaAtual"
              name="senhaAtual"
              type="password"
              autoComplete="current-password"
              required
              className={classeCampo}
            />
          </Campo>
          <Campo id="senhaNova" rotulo="Senha nova">
            <input
              id="senhaNova"
              name="senhaNova"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={classeCampo}
            />
          </Campo>
          <Campo id="senhaRepete" rotulo="Repita a senha nova">
            <input
              id="senhaRepete"
              name="senhaRepete"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={classeCampo}
            />
          </Campo>
          {senha.erro ? (
            <p className="text-lg text-hearing" role="alert">
              {senha.erro}
            </p>
          ) : null}
          {senha.ok ? (
            <output className="block text-xl text-done">{senha.ok}</output>
          ) : null}
          <button
            type="submit"
            disabled={pendenteSenha}
            className="w-full bg-pen px-4 py-3 text-xl font-bold text-sheet disabled:opacity-60"
          >
            {pendenteSenha ? "Salvando…" : "Salvar senha"}
          </button>
        </form>
      </section>
    </div>
  );
}
