import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CalendarioAno } from "@/components/calendario-ano";
import { hojeNoEscritorio, marcasDoAno } from "@/lib/contagens";

export default function Ano({ params }: { params: Promise<{ ano: string }> }) {
  return (
    <Suspense fallback={<p className="text-muted">Abrindo o ano.</p>}>
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
    <section className="entrada mx-auto w-full max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href={`/anos/${ano - 1}`} className="btn">
          ← {ano - 1}
        </Link>
        <div className="text-center">
          <h1 className="titulo-pagina">{ano}</h1>
          <Link href="/anos" className="btn-texto text-[0.9688rem]">
            Todos os anos
          </Link>
        </div>
        <Link href={`/anos/${ano + 1}`} className="btn">
          {ano + 1} →
        </Link>
      </div>
      <CalendarioAno ano={ano} hoje={hoje} marcas={marcas} />
    </section>
  );
}
