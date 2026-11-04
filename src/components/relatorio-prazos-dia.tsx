"use client";

import { useState, useTransition } from "react";
import { gerarPrazosDoDia } from "@/app/(painel)/admin/relatorios/actions";
import { dataBr, dataHoraBr } from "@/lib/datas";

type Geracao = {
  id: string;
  data: string;
  total: number;
  geradoEm: string;
};

export function RelatorioPrazosDia({ hoje }: { hoje: string }) {
  const [dia, setDia] = useState(hoje);
  const [erro, setErro] = useState("");
  const [geracoes, setGeracoes] = useState<Geracao[]>([]);
  const [pendente, startTransition] = useTransition();

  function gerar() {
    setErro("");
    startTransition(async () => {
      const resultado = await gerarPrazosDoDia(dia);
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }
      setGeracoes((lista) => [
        {
          id: `${resultado.data}-${resultado.geradoEm}`,
          data: resultado.data,
          total: resultado.total,
          geradoEm: resultado.geradoEm,
        },
        ...lista,
      ]);
    });
  }

  return (
    <section className="mt-8">
      <h2 className="titulo-secao">Exportações</h2>
      <p className="mt-2 text-base text-muted">
        Monte a planilha ou o PDF dos prazos de um dia, com partes e status
        tirados da publicação.
      </p>

      <article className="cartao mt-5 overflow-hidden">
        <div className="border-b border-line bg-pen-soft px-5 py-4">
          <p className="text-sm font-semibold tracking-wide text-pen uppercase">
            Relatório
          </p>
          <h3 className="mt-1 text-2xl font-semibold text-ink">
            Prazos do dia
          </h3>
          <p className="mt-2 max-w-2xl text-base text-muted">
            Reclamante, processo, reclamada, data adicional (quando o texto cita
            outro dia) e status (observação).
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <div>
            <label
              htmlFor="relatorio-dia"
              className="mb-2 block text-lg text-ink"
            >
              Dia
            </label>
            <input
              id="relatorio-dia"
              type="date"
              value={dia}
              onChange={(evento) => setDia(evento.target.value)}
              className="campo"
            />
          </div>
          <button
            type="button"
            className="btn btn-primario"
            disabled={pendente || !dia}
            onClick={gerar}
          >
            {pendente ? "Gerando…" : "Gerar"}
          </button>
        </div>
        {erro ? (
          <p className="aviso aviso-erro mx-5 mb-4" role="alert">
            {erro}
          </p>
        ) : null}
      </article>

      {geracoes.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left text-base text-ink">
            <thead>
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-semibold">Data do relatório</th>
                <th className="py-2 pr-3 font-semibold">Gerado em</th>
                <th className="py-2 pr-3 font-semibold">Prazos</th>
                <th className="py-2 font-semibold">Baixar</th>
              </tr>
            </thead>
            <tbody>
              {geracoes.map((item) => (
                <tr key={item.id} className="border-b border-line">
                  <td className="py-3 pr-3">{dataBr(item.data)}</td>
                  <td className="py-3 pr-3">
                    {dataHoraBr(new Date(item.geradoEm))}
                  </td>
                  <td className="py-3 pr-3">
                    {item.total === 1 ? "1 prazo" : `${item.total} prazos`}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/admin/relatorios/prazos-dia.xlsx?data=${item.data}`}
                        className="btn btn-primario btn-pequeno"
                      >
                        Baixar XLS
                      </a>
                      <a
                        href={`/admin/relatorios/prazos-dia.pdf?data=${item.data}`}
                        className="btn btn-pequeno"
                      >
                        Baixar PDF
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-base text-muted">
          Ainda não gerou nenhum arquivo nesta sessão. Escolha o dia e clique em
          Gerar.
        </p>
      )}
    </section>
  );
}
