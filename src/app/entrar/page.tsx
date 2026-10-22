import type { Metadata } from "next";
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
      <section className="relative hidden overflow-hidden bg-rail p-14 text-rail-ink lg:flex lg:flex-col lg:justify-center">
        <div className="absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-sage/10 blur-3xl" />
        <Simbolo
          className="pointer-events-none absolute -right-28 -bottom-24 h-[36rem] w-auto opacity-[0.05]"
          cor="branco"
        />
        <div className="relative">
          <Marca variante="login" />
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
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        <span className="flex items-center gap-3 lg:hidden">
          <Simbolo cor="verde" className="h-9 w-auto dark:hidden" />
          <Simbolo cor="branco" className="hidden h-9 w-auto dark:block" />
          Agenda Coelho Vignini
        </span>
        <span className="hidden lg:inline">Entrar</span>
      </h1>
      <p className="subtitulo-pagina hidden lg:block">
        Usuário e senha do escritório.
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
    </div>
  );
}
