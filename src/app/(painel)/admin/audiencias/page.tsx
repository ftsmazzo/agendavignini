import Link from "next/link";
import { Suspense } from "react";
import { classeCampo } from "@/components/campo";
import {
  anosDasAudiencias,
  listarAudiencias,
  listarAudienciasAdmin,
} from "@/lib/audiencias";
import { dataBr, dataHoraBr, dataIsoValida } from "@/lib/datas";

export default function ListarAudienciasAdmin({
  searchParams,
}: {
  searchParams: Promise<{
    data?: string;
    ano?: string;
    q?: string;
    excluido?: string;
  }>;
}) {
  return (
    <Suspense fallback={<p className="text-muted">Abrindo as audiências.</p>}>
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

function partes(reclamante: string | null, reclamado: string | null) {
  return [reclamante, reclamado].filter(Boolean).join(" × ");
}

async function Lista({
  searchParams,
}: {
  searchParams: Promise<{
    data?: string;
    ano?: string;
    q?: string;
    excluido?: string;
  }>;
}) {
  const { data, ano, q, excluido } = await searchParams;
  const dia = data && dataIsoValida(data) ? data : null;
  const termo = q?.trim().slice(0, 120) ?? "";
  const anos = await anosDasAudiencias();
  const anoPedido =
    ano && /^\d{4}$/.test(ano) ? Number(ano) : (anos[0]?.ano ?? null);
  const doDia = dia ? await listarAudiencias(dia, 0) : [];
  const itens = dia
    ? []
    : await listarAudienciasAdmin({
        ano: termo ? null : anoPedido,
        termo,
      });

  return (
    <section className="entrada mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="titulo-pagina">
          {dia ? `Audiências de ${dataBr(dia)}` : "Listar audiências"}
        </h1>
        <Link href="/admin/audiencias/nova" className="btn btn-primario">
          + Adicionar nova
        </Link>
      </div>
      {excluido ? (
        <output className="aviso aviso-ok mt-4 block">
          Audiência excluída.
        </output>
      ) : null}
      {dia ? null : (
        <nav aria-label="Anos" className="mt-6 flex flex-wrap gap-2">
          {anos.map((item) => (
            <Link
              key={item.ano}
              href={`/admin/audiencias?ano=${item.ano}`}
              aria-current={
                !termo && item.ano === anoPedido ? "page" : undefined
              }
              className="chip"
            >
              {item.ano}
            </Link>
          ))}
        </nav>
      )}
      <search className="cartao mt-6 block p-4 md:p-5">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <label htmlFor="buscar-audiencia" className="rotulo-campo">
              Processo, parte ou local
            </label>
            <input
              id="buscar-audiencia"
              name="q"
              type="search"
              defaultValue={termo}
              className={classeCampo}
            />
          </div>
          <div>
            <label htmlFor="data-audiencia" className="rotulo-campo">
              Ver um dia
            </label>
            <input
              id="data-audiencia"
              name="data"
              type="date"
              defaultValue={dia ?? ""}
              className={classeCampo}
            />
          </div>
          <button type="submit" className="btn btn-primario">
            Ver
          </button>
        </form>
      </search>
      {dia ? (
        <p className="mt-4">
          <Link
            href={`/admin/audiencias?ano=${dia.slice(0, 4)}`}
            className="btn-texto"
          >
            ← Todas as audiências
          </Link>
        </p>
      ) : null}
      <p className="mt-4 text-muted">
        {dia
          ? `${doDia.length} neste dia.`
          : termo
            ? itens.length === 80
              ? "80 primeiras em todos os anos."
              : `${itens.length} em todos os anos.`
            : `${itens.length} em ${anoPedido ?? "todos os anos"}.`}
      </p>
      {(dia ? doDia : itens).length === 0 ? (
        <p className="vazio mt-6">Nenhuma audiência neste recorte.</p>
      ) : (
        <ul className="lista-cartoes mt-4">
          {(dia ? doDia : itens).map((item) => (
            <li key={item.id}>
              <Link
                href={`/admin/audiencias/${item.id}`}
                className="block px-5 py-4"
              >
                <p className="flex flex-wrap items-center gap-2">
                  <span className="selo selo-audiencia">
                    {dataHoraBr(item.dataHora)}
                  </span>
                  {item.preposto ? (
                    <span className="selo selo-neutro">
                      Preposto: {item.preposto}
                    </span>
                  ) : null}
                </p>
                <p className="mt-2 text-lg font-bold text-pen">
                  {item.numeroProcesso || "Sem número"}
                </p>
                <p className="mt-1 text-ink">
                  {[item.local, item.vara].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1 text-muted">
                  {partes(item.reclamante, item.reclamado)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
