import { asc, sql } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { obterDb } from "@/db/client";
import { prazos } from "@/db/schema";

export default function OutrosAnos() {
  return (
    <Suspense fallback={<p className="text-muted">Abrindo os anos.</p>}>
      <Lista />
    </Suspense>
  );
}

async function Lista() {
  await connection();
  const db = obterDb();
  const linhas = await db
    .select({
      ano: sql<number>`extract(year from ${prazos.data})::int`,
    })
    .from(prazos)
    .groupBy(sql`extract(year from ${prazos.data})`)
    .orderBy(asc(sql`extract(year from ${prazos.data})`));

  return (
    <section className="entrada mx-auto w-full max-w-5xl">
      <h1 className="titulo-pagina">Outros anos</h1>
      <p className="subtitulo-pagina">
        Cada ano abre janeiro. Dali dá para seguir mês a mês.
      </p>
      <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {linhas.map((linha) => (
          <li key={linha.ano}>
            <Link
              href={`/anos/${linha.ano}`}
              className="cartao-link px-4 py-6 text-center text-2xl font-bold text-pen"
            >
              {linha.ano}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
