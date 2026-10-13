import { asc, sql } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { obterDb } from "@/db/client";
import { prazos } from "@/db/schema";

export default function OutrosAnos() {
  return (
    <Suspense fallback={<p className="text-xl text-muted">Abrindo os anos.</p>}>
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
    <section className="mx-auto w-full max-w-5xl">
      <h1 className="text-4xl leading-tight font-bold text-ink">Outros anos</h1>
      <p className="mt-4 text-xl text-muted">
        Cada ano abre janeiro. Dali dá para seguir mês a mês.
      </p>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {linhas.map((linha) => (
          <li key={linha.ano}>
            <Link
              href={`/?mes=${linha.ano}-01`}
              className="block border border-line bg-sheet px-4 py-5 text-center text-3xl font-bold text-ink"
            >
              {linha.ano}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
