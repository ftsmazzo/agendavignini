"use client";

import { useState } from "react";
import { dataBr } from "@/lib/datas";
import { textoPrazo } from "@/lib/texto-prazo";

export type LinhaFolha = {
  id: number;
  area: "administrativo" | "civil" | "trabalhista";
  data: string;
  titulo: string;
  processo: string;
  status: string;
  advogados: string;
  observacao: string;
  conteudo: string;
  situacao: "aberto" | "cumprido";
  compacta: boolean;
};

const AREAS = [
  { id: "trabalhista" as const, rotulo: "Trabalhistas" },
  { id: "civil" as const, rotulo: "Cíveis" },
  { id: "administrativo" as const, rotulo: "Administrativos" },
];

export function FolhaPrazos({
  itens,
  agrupado,
}: {
  itens: LinhaFolha[];
  agrupado: boolean;
}) {
  const [marcados, setMarcados] = useState<number[]>(() =>
    itens.filter((item) => item.situacao === "aberto").map((item) => item.id),
  );
  const escolhidos = new Set(marcados);

  function alternar(id: number) {
    setMarcados((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id],
    );
  }

  function marcarArea(area: LinhaFolha["area"]) {
    setMarcados((atual) => {
      const conjunto = new Set(atual);
      for (const item of itens) {
        if (item.area === area) {
          conjunto.add(item.id);
        }
      }
      return [...conjunto];
    });
  }

  function soAbertos() {
    setMarcados(
      itens.filter((item) => item.situacao === "aberto").map((item) => item.id),
    );
  }

  const dias = [...new Set(itens.map((item) => item.data))];

  return (
    <div>
      <div className="nao-imprimir mt-4 flex flex-wrap gap-2">
        {AREAS.map((area) => (
          <button
            key={area.id}
            type="button"
            className="btn btn-pequeno"
            onClick={() => marcarArea(area.id)}
          >
            Marcar {area.rotulo}
          </button>
        ))}
        <button type="button" className="btn btn-pequeno" onClick={soAbertos}>
          Só os em aberto
        </button>
        <p className="self-center text-base text-muted">
          {escolhidos.size} na folha. Desmarque o que não precisa imprimir.
        </p>
      </div>
      {agrupado
        ? dias.map((dia) => (
            <section key={dia} className="bloco-dia mt-8">
              <h2 className="text-2xl font-bold text-ink">
                {dataBr(dia)} ·{" "}
                {itens.filter((item) => item.data === dia).length}
              </h2>
              <ul>
                {itens
                  .filter((item) => item.data === dia)
                  .map((item) => (
                    <Item
                      key={item.id}
                      item={item}
                      marcado={escolhidos.has(item.id)}
                      onAlternar={alternar}
                    />
                  ))}
              </ul>
            </section>
          ))
        : itens.map((item) => (
            <Item
              key={item.id}
              item={item}
              marcado={escolhidos.has(item.id)}
              onAlternar={alternar}
            />
          ))}
    </div>
  );
}

function Item({
  item,
  marcado,
  onAlternar,
}: {
  item: LinhaFolha;
  marcado: boolean;
  onAlternar: (id: number) => void;
}) {
  const area =
    item.area === "trabalhista"
      ? "trabalhista"
      : item.area === "civil"
        ? "cível"
        : "administrativo";
  const status =
    item.situacao !== "cumprido"
      ? "Prazo não cumprido"
      : item.status === "Cumprido"
        ? "Prazo cumprido"
        : item.status.startsWith("Cumprido ")
          ? `Prazo ${item.status.charAt(0).toLowerCase()}${item.status.slice(1)}`
          : item.status;
  const cabecalho = `${item.titulo} ${dataBr(item.data)} - Prazo ${area} - ${status}`;

  return (
    <article className={`folha-item ${marcado ? "" : "fora-da-folha"}`}>
      <label className="nao-imprimir flex items-start gap-3 text-base text-ink">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5"
          checked={marcado}
          onChange={() => onAlternar(item.id)}
        />
        <span>
          Incluir na impressão
          {item.situacao === "cumprido" ? " · cumprido" : ""}
        </span>
      </label>
      <h3 className="folha-titulo">{cabecalho}</h3>
      {item.compacta ? (
        <p className="folha-linha">
          {item.advogados || "Sem advogado marcado"}
        </p>
      ) : (
        <>
          {item.observacao ? (
            <div className="folha-bloco">
              <p className="folha-rotulo">Observação</p>
              <p className="folha-texto">{textoPrazo(item.observacao)}</p>
            </div>
          ) : null}
          {item.conteudo ? (
            <div className="folha-bloco">
              <p className="folha-rotulo">Descrição</p>
              <p className="folha-texto">{textoPrazo(item.conteudo)}</p>
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}
