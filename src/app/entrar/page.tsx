import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Entrar · Agenda Coelho Vignini",
};

export default function Entrar() {
  return (
    <main className="flex min-h-full items-center justify-center bg-paper px-4 py-16">
      <div className="w-full max-w-md border border-line bg-sheet px-8 py-10">
        <h1 className="text-4xl font-bold text-ink">Coelho Vignini</h1>
        <p className="mt-2 text-xl text-muted">Agenda do escritório</p>
        <form className="mt-8 space-y-5" action="/entrar" method="post">
          <div>
            <label htmlFor="login" className="mb-2 block text-xl text-ink">
              Usuário
            </label>
            <input
              id="login"
              name="login"
              autoComplete="username"
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
              className="w-full border border-line bg-paper px-4 py-3 text-xl text-ink"
            />
          </div>
          <button
            type="submit"
            disabled
            className="w-full bg-pen px-4 py-3 text-xl font-bold text-sheet disabled:cursor-not-allowed disabled:opacity-60"
          >
            Entrar
          </button>
        </form>
        <p className="mt-6 text-lg leading-7 text-muted">
          O acesso com senha entra na próxima etapa. As telas já podem ser
          revisadas pela{" "}
          <Link href="/" className="text-pen underline">
            tela inicial
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
