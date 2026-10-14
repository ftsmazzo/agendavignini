"use client";

import { useActionState } from "react";
import {
  excluirAudiencia,
  salvarAudiencia,
} from "@/app/(painel)/admin/audiencias/actions";
import { BotaoExcluir } from "@/components/botao-excluir";
import { CaixasAdvogados } from "@/components/caixas-advogados";
import { Campo, classeCampo } from "@/components/campo";

type Pessoa = { id: number; nome: string };

export function FormularioAudiencia({
  audiencia,
  responsaveis,
  advogados,
}: {
  audiencia?: {
    id: number;
    numeroProcesso: string;
    vara: string;
    local: string;
    reclamante: string;
    reclamado: string;
    preposto: string;
    dataHora: string;
    observacao: string;
  };
  responsaveis: Pessoa[];
  advogados: number[];
}) {
  const [estado, acao, pendente] = useActionState(salvarAudiencia, {
    erro: "",
  });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-4xl leading-tight font-bold text-ink">
        {audiencia ? "Editar audiência" : "Adicionar audiência"}
      </h1>
      <form action={acao} className="mt-8 space-y-5">
        {audiencia ? (
          <input type="hidden" name="id" value={audiencia.id} />
        ) : null}
        <div className="grid gap-5 md:grid-cols-2">
          <Campo id="numeroProcesso" rotulo="Núm. processo">
            <input
              id="numeroProcesso"
              name="numeroProcesso"
              defaultValue={audiencia?.numeroProcesso ?? ""}
              className={classeCampo}
            />
          </Campo>
          <Campo id="vara" rotulo="Vara">
            <input
              id="vara"
              name="vara"
              defaultValue={audiencia?.vara ?? ""}
              className={classeCampo}
            />
          </Campo>
          <Campo id="local" rotulo="Local">
            <input
              id="local"
              name="local"
              defaultValue={audiencia?.local ?? ""}
              className={classeCampo}
            />
          </Campo>
          <Campo id="dataHora" rotulo="Data / hora">
            <input
              id="dataHora"
              name="dataHora"
              type="datetime-local"
              required
              defaultValue={audiencia?.dataHora ?? ""}
              className={classeCampo}
            />
          </Campo>
          <Campo id="reclamante" rotulo="Reclamante">
            <input
              id="reclamante"
              name="reclamante"
              defaultValue={audiencia?.reclamante ?? ""}
              className={classeCampo}
            />
          </Campo>
          <Campo id="reclamado" rotulo="Reclamado">
            <input
              id="reclamado"
              name="reclamado"
              defaultValue={audiencia?.reclamado ?? ""}
              className={classeCampo}
            />
          </Campo>
        </div>
        <Campo id="preposto" rotulo="Preposto">
          <input
            id="preposto"
            name="preposto"
            defaultValue={audiencia?.preposto ?? ""}
            className={classeCampo}
          />
        </Campo>
        <Campo id="observacao" rotulo="Observação">
          <textarea
            id="observacao"
            name="observacao"
            rows={4}
            defaultValue={audiencia?.observacao ?? ""}
            className={classeCampo}
          />
        </Campo>
        <CaixasAdvogados
          pessoas={responsaveis}
          marcados={advogados.map(String)}
        />
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
          {pendente ? "Salvando…" : "Salvar audiência"}
        </button>
      </form>
      {audiencia ? (
        <div className="mt-4">
          <BotaoExcluir
            action={excluirAudiencia}
            pergunta="Excluir esta audiência?"
            rotulo="Excluir audiência"
          >
            <input type="hidden" name="id" value={audiencia.id} />
          </BotaoExcluir>
        </div>
      ) : null}
    </div>
  );
}
