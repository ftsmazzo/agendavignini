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
    <div className="entrada mx-auto w-full max-w-5xl">
      <header>
        <h1 className="titulo-pagina">Alterar dados</h1>
        <p className="subtitulo-pagina">
          Seus dados de contato e a senha de acesso.
        </p>
      </header>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <section className="cartao p-5 md:p-7">
          <h2 className="titulo-secao">Dados pessoais</h2>
          <form action={acaoDados} className="mt-5 space-y-5">
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
              <p className="aviso aviso-erro" role="alert">
                {dados.erro}
              </p>
            ) : null}
            {dados.ok ? (
              <output className="aviso aviso-ok block">{dados.ok}</output>
            ) : null}
            <button
              type="submit"
              disabled={pendenteDados}
              className="btn btn-primario btn-cheio disabled:opacity-60"
            >
              {pendenteDados ? "Salvando…" : "Salvar dados"}
            </button>
          </form>
        </section>
        <section className="cartao p-5 md:p-7">
          <h2 className="titulo-secao">Alterar senha</h2>
          <form action={acaoSenha} className="mt-5 space-y-5">
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
              <p className="aviso aviso-erro" role="alert">
                {senha.erro}
              </p>
            ) : null}
            {senha.ok ? (
              <output className="aviso aviso-ok block">{senha.ok}</output>
            ) : null}
            <button
              type="submit"
              disabled={pendenteSenha}
              className="btn btn-primario btn-cheio disabled:opacity-60"
            >
              {pendenteSenha ? "Salvando…" : "Salvar senha"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
