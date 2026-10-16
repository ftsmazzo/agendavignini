import type { Metadata } from "next";
import Image from "next/image";
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
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section
        aria-hidden
        className="relative hidden overflow-hidden bg-rail p-12 text-rail-ink lg:flex lg:flex-col lg:justify-between"
      >
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-pen/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
        <Image
          src="/marca-coelho-vignini.png"
          alt="Coelho Vignini Advogados Associados"
          width={1024}
          height={576}
          priority
          className="relative h-auto w-full max-w-lg"
        />
        <div className="relative max-w-md">
          <h2 className="text-3xl leading-tight font-bold tracking-tight">
            Cada prazo no seu tempo. Cada audiência no seu lugar.
          </h2>
          <p className="mt-4 text-lg text-rail-muted">
            A agenda do escritório reúne prazos, audiências e contatos em um só
            lugar, simples de consultar todos os dias.
          </p>
        </div>
        <p className="relative text-sm text-rail-muted">
          Sistema interno · acesso restrito à equipe
        </p>
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
      <Image
        src="/marca-coelho-vignini.png"
        alt="Coelho Vignini Advogados Associados"
        width={1024}
        height={576}
        priority
        className="mb-6 h-auto w-full rounded-xl lg:hidden"
      />
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
