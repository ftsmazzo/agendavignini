import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { entrar } from "@/app/entrar/actions";

export const metadata: Metadata = {
  title: "Entrar · Agenda Coelho Vignini",
};

export default function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  return (
    <main className="flex min-h-full items-center justify-center bg-paper px-4 py-16">
      <Suspense
        fallback={<p className="text-xl text-muted">Abrindo o acesso.</p>}
      >
        <Formulario searchParams={searchParams} />
      </Suspense>
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
    <div className="w-full max-w-md border border-line bg-sheet px-8 py-10">
      <h1 className="text-4xl font-bold text-ink">Coelho Vignini</h1>
      <p className="mt-2 text-xl text-muted">Agenda do escritório</p>
      <form className="mt-8 space-y-5" action={entrar}>
        <div>
          <label htmlFor="login" className="mb-2 block text-xl text-ink">
            Usuário
          </label>
          <input
            id="login"
            name="login"
            autoComplete="username"
            required
            className="w-full border border-line bg-paper px-4 py-3 text-xl text-ink"
          />
        </div>
        <div>
          <label htmlFor="senha" className="mb-2 block text-xl text-ink">
            Senha
          </label>
          <input
            id="senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            required
            className="w-full border border-line bg-paper px-4 py-3 text-xl text-ink"
          />
        </div>
        {erro ? (
          <p className="text-lg text-hearing" role="alert">
            Usuário ou senha não conferem.
          </p>
        ) : null}
        <button
          type="submit"
          className="w-full bg-pen px-4 py-3 text-xl font-bold text-sheet"
        >
          Entrar
        </button>
      </form>
      <p className="mt-6 text-lg leading-7 text-muted">
        Use o mesmo usuário de sempre. No primeiro acesso a senha antiga é
        trocada por uma proteção nova.{" "}
        <Link href="/" className="text-pen underline">
          Voltar
        </Link>
      </p>
    </div>
  );
}
