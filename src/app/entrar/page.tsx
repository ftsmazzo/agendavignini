import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { entrar } from "@/app/entrar/actions";
import { Marca, Simbolo } from "@/components/marca";

export const metadata: Metadata = {
  title: "Entrar · Agenda Coelho Vignini",
};

export default function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-rail p-14 text-rail-ink lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-sage/10 blur-3xl" />
        <Simbolo
          className="pointer-events-none absolute -right-28 -bottom-24 h-[36rem] w-auto opacity-[0.05]"
          cor="branco"
        />
        <div className="relative flex flex-1 flex-col justify-center">
          <Marca variante="login" />
        </div>
        <div className="relative max-w-md border-t border-rail-line pt-6">
          <p className="text-lg text-rail-muted">
            A agenda do escritório reúne prazos, audiências e contatos em um só
            lugar, simples de consultar todos os dias.
          </p>
          <p className="mt-6 text-sm text-rail-muted">
            Sistema interno · acesso restrito à equipe
          </p>
        </div>
      </section>
      <div className="flex items-center justify-center bg-paper px-5 py-12">
        <Suspense
          fallback={<p className="text-lg text-muted">Abrindo o acesso.</p>}
        >
          <Formulario searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Formulario({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <div className="entrada cartao w-full max-w-md p-8 shadow-media md:p-10">
      <div className="-mx-2 -mt-2 mb-7 rounded-xl bg-rail p-5 text-rail-ink lg:hidden">
        <Marca />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-ink">
        Bem-vindo de volta
      </h1>
      <p className="mt-2 text-muted">
        Entre para ver os prazos e audiências do escritório.
      </p>
      <form className="mt-8 space-y-5" action={entrar}>
        <div>
          <label htmlFor="login" className="rotulo-campo">
            Usuário
          </label>
          <input
            id="login"
            name="login"
            autoComplete="username"
            required
            className="campo"
          />
        </div>
        <div>
          <label htmlFor="senha" className="rotulo-campo">
            Senha
          </label>
          <input
            id="senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            required
            className="campo"
          />
        </div>
        {erro ? (
          <p className="aviso aviso-erro" role="alert">
            Usuário ou senha não conferem.
          </p>
        ) : null}
        <button type="submit" className="btn btn-primario btn-cheio">
          Entrar
        </button>
      </form>
      <p className="mt-6 text-[0.9375rem] leading-6 text-muted">
        Use o mesmo usuário de sempre. No primeiro acesso a senha antiga é
        trocada por uma proteção nova.{" "}
        <Link href="/" className="btn-texto">
          Voltar
        </Link>
      </p>
    </div>
  );
}
