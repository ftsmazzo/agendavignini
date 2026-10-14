import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CalendarioAno } from "@/components/calendario-ano";
import { hojeNoEscritorio, marcasDoAno } from "@/lib/contagens";

export default function Ano({ params }: { params: Promise<{ ano: string }> }) {
  return (
    <Suspense fallback={<p className="text-xl text-muted">Abrindo o ano.</p>}>
      <Quadro params={params} />
    </Suspense>
  );
}

async function Quadro({ params }: { params: Promise<{ ano: string }> }) {
  const { ano: bruto } = await params;
  await connection();
  if (!/^\d{4}$/.test(bruto)) {
    redirect("/anos");
  }
  const ano = Number(bruto);
  if (ano < 1900 || ano > 2100) {
    redirect("/anos");
  }
  const hoje = hojeNoEscritorio();
  const marcas = await marcasDoAno(ano, hoje);

  return (
    <section className="mx-auto w-full max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/anos/${ano - 1}`}
          className="border border-line bg-sheet px-4 py-3 text-lg font-semibold text-ink"
        >
          {ano - 1}
        </Link>
        <h1 className="text-4xl leading-none font-bold text-ink">{ano}</h1>
        <Link
          href={`/anos/${ano + 1}`}
          className="border border-line bg-sheet px-4 py-3 text-lg font-semibold text-ink"
        >
          {ano + 1}
        </Link>
      </div>
      <p className="mt-4 text-xl">
        <Link href="/anos" className="text-pen">
          Todos os anos
        </Link>
      </p>
      <CalendarioAno ano={ano} hoje={hoje} marcas={marcas} />
    </section>
  );
}
