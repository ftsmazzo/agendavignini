"use client";

import { useActionState } from "react";
import { excluirPrazo, salvarPrazo } from "@/app/(painel)/admin/prazos/actions";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Campo, classeCampo } from "@/components/campo";

const AREAS = [
  { valor: "administrativo", rotulo: "Administrativo" },
  { valor: "civil", rotulo: "Cível" },
  { valor: "trabalhista", rotulo: "Trabalhista" },
] as const;

type Pessoa = { id: number; nome: string };

export function FormularioPrazo({
  prazo,
  pessoas,
  responsaveis,
  advogados,
  hoje,
}: {
  prazo?: {
    id: number;
    area: string;
    data: string;
    titulo: string;
    observacao: string;
    conteudo: string;
    cumpridoPorId: number | null;
  };
  pessoas: Pessoa[];
  responsaveis: Pessoa[];
  advogados: number[];
  hoje: string;
}) {
  const [estado, acao, pendente] = useActionState(salvarPrazo, { erro: "" });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-4xl leading-tight font-bold text-ink">
        {prazo ? "Editar prazo" : "Adicionar prazo"}
      </h1>
      <form action={acao} className="mt-8 space-y-5">
        {prazo ? <input type="hidden" name="id" value={prazo.id} /> : null}
        <div className="grid gap-5 md:grid-cols-2">
          <Campo id="area" rotulo="Tipo">
            <select
              id="area"
              name="area"
              defaultValue={prazo?.area ?? "administrativo"}
              className={classeCampo}
            >
              {AREAS.map((item) => (
                <option key={item.valor} value={item.valor}>
                  {item.rotulo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="data" rotulo="Data">
            <input
              id="data"
              name="data"
              type="date"
              required
              min={prazo ? undefined : hoje}
              defaultValue={prazo?.data ?? hoje}
              className={classeCampo}
            />
          </Campo>
        </div>
        <Campo id="titulo" rotulo="Prazo">
          <input
            id="titulo"
            name="titulo"
            required
            defaultValue={prazo?.titulo ?? ""}
            className={classeCampo}
          />
        </Campo>
        <Campo id="observacao" rotulo="Observação">
          <textarea
            id="observacao"
            name="observacao"
            rows={5}
            defaultValue={prazo?.observacao ?? ""}
            className={classeCampo}
          />
        </Campo>
        <Campo id="conteudo" rotulo="Conteúdo">
          <textarea
            id="conteudo"
            name="conteudo"
            rows={12}
            defaultValue={prazo?.conteudo ?? ""}
            className={classeCampo}
          />
        </Campo>
        <Campo id="cumpridoPor" rotulo="Status">
          <select
            id="cumpridoPor"
            name="cumpridoPor"
            defaultValue={
              prazo?.cumpridoPorId ? String(prazo.cumpridoPorId) : ""
            }
            className={classeCampo}
          >
            <option value="">Não cumprido</option>
            {pessoas.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                Cumprido por {pessoa.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="advogados" rotulo="Advogados">
          <select
            id="advogados"
            name="advogados"
            multiple
            required
            size={8}
            defaultValue={advogados.map(String)}
            className={classeCampo}
          >
            {responsaveis.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.nome}
              </option>
            ))}
          </select>
        </Campo>
        <p className="text-lg text-muted">
          Segure Ctrl para marcar mais de um advogado. Pelo menos um é
          obrigatório.
        </p>
        {estado.erro ? (
          <p className="text-lg text-hearing" role="alert">
            {estado.erro}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pendente}
          className="w-full bg-pen px-4 py-3 text-xl font-bold text-sheet disabled:opacity-60"
        >
          {pendente ? "Salvando…" : "Salvar prazo"}
        </button>
      </form>
      {prazo ? (
        <div className="mt-4">
          <BotaoExcluir
            action={excluirPrazo}
            pergunta="Excluir este prazo?"
            rotulo="Excluir prazo"
          >
            <input type="hidden" name="id" value={prazo.id} />
            <input
              type="hidden"
              name="voltar"
              value={`/prazos?data=${prazo.data}`}
            />
          </BotaoExcluir>
        </div>
      ) : null}
    </div>
  );
}
