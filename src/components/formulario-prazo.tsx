"use client";

import { useActionState, useState } from "react";
import { excluirPrazo, salvarPrazo } from "@/app/(painel)/admin/prazos/actions";
import { BotaoExcluir } from "@/components/botao-excluir";
import { CaixasAdvogados } from "@/components/caixas-advogados";
import { Campo, classeCampo } from "@/components/campo";
import { dataBr, dataIsoValida, ehFimDeSemana } from "@/lib/datas";
import { sugerirPublicacao } from "@/lib/publicacao";
import { datasRecorrentes } from "@/lib/recorrencia";

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
    id?: number;
    area: string;
    data: string;
    titulo: string;
    observacao: string;
    conteudo: string;
    defesa?: boolean;
    cumpridoPorId: number | null;
    cumpridoEm: string;
  };
  pessoas: Pessoa[];
  responsaveis: Pessoa[];
  advogados: number[];
  hoje: string;
}) {
  const [estado, acao, pendente] = useActionState(salvarPrazo, { erro: "" });
  const [rascunho, setRascunho] = useState("");
  const [avisos, setAvisos] = useState<string[]>([]);
  const [area, setArea] = useState(prazo?.area ?? "administrativo");
  const [data, setData] = useState(prazo?.data ?? hoje);
  const [titulo, setTitulo] = useState(prazo?.titulo ?? "");
  const [observacao, setObservacao] = useState(prazo?.observacao ?? "");
  const [conteudo, setConteudo] = useState(prazo?.conteudo ?? "");
  const [advogadosMarcados, setAdvogadosMarcados] = useState(
    advogados.map(String),
  );
  const [meses, setMeses] = useState("");
  const [intervalo, setIntervalo] = useState("");
  const mesesNumero = Number(meses);
  const intervaloNumero = Number(intervalo);
  const previa =
    !prazo?.id &&
    Number.isInteger(mesesNumero) &&
    mesesNumero >= 1 &&
    mesesNumero <= 24 &&
    Number.isInteger(intervaloNumero) &&
    intervaloNumero >= 1 &&
    intervaloNumero <= 180 &&
    dataIsoValida(data) &&
    !ehFimDeSemana(data)
      ? datasRecorrentes(data, mesesNumero, intervaloNumero)
      : null;

  function aplicarSugestao() {
    const sugestao = sugerirPublicacao(rascunho, hoje, responsaveis);
    setAvisos(sugestao.avisos);
    if (sugestao.area) {
      setArea(sugestao.area);
    }
    if (sugestao.data) {
      setData(sugestao.data);
    }
    if (sugestao.titulo) {
      setTitulo(sugestao.titulo);
    }
    if (sugestao.observacao) {
      setObservacao(sugestao.observacao);
    }
    if (sugestao.conteudo) {
      setConteudo(sugestao.conteudo);
    }
    if (sugestao.advogados.length > 0) {
      setAdvogadosMarcados(sugestao.advogados.map(String));
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="titulo-pagina">
        {prazo?.id ? "Editar prazo" : "Adicionar prazo"}
      </h1>
      {prazo ? null : (
        <div className="cartao mt-6 p-5">
          <Campo id="publicacao" rotulo="Colar publicação">
            <textarea
              id="publicacao"
              value={rascunho}
              rows={8}
              onChange={(evento) => setRascunho(evento.target.value)}
              className={classeCampo}
            />
          </Campo>
          <button type="button" onClick={aplicarSugestao} className="btn mt-3">
            Sugerir campos
          </button>
          <p className="ajuda-campo">
            A sugestão só preenche. O prazo só entra quando você salva.
          </p>
          {avisos.length > 0 ? (
            <ul className="aviso mt-3 list-disc pl-8">
              {avisos.map((aviso) => (
                <li key={aviso}>{aviso}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
      <form action={acao} className="cartao mt-6 space-y-5 p-5">
        {prazo?.id ? <input type="hidden" name="id" value={prazo.id} /> : null}
        <div className="grid gap-5 md:grid-cols-2">
          <Campo id="area" rotulo="Tipo">
            <select
              id="area"
              name="area"
              value={area}
              onChange={(evento) => setArea(evento.target.value)}
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
              min={prazo?.id ? undefined : hoje}
              value={data}
              onChange={(evento) => setData(evento.target.value)}
              className={classeCampo}
            />
          </Campo>
        </div>
        {prazo?.id ? null : (
          <div className="grid gap-5 md:grid-cols-2">
            <Campo id="meses" rotulo="Repetir por quantos meses">
              <input
                id="meses"
                name="meses"
                type="number"
                min={1}
                max={24}
                inputMode="numeric"
                value={meses}
                onChange={(evento) => setMeses(evento.target.value)}
                className={classeCampo}
              />
            </Campo>
            <Campo id="intervalo" rotulo="A cada quantos dias">
              <input
                id="intervalo"
                name="intervalo"
                type="number"
                min={1}
                max={180}
                inputMode="numeric"
                value={intervalo}
                onChange={(evento) => setIntervalo(evento.target.value)}
                className={classeCampo}
              />
            </Campo>
          </div>
        )}
        {prazo?.id ? null : (
          <div className="ajuda-campo">
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Meses e intervalo em branco: registra uma data só, a escolhida
                acima.
              </li>
              <li>
                Sábado, domingo ou feriado: essa data pula para o próximo dia
                útil.
              </li>
            </ol>
            {previa && previa.datas.length > 1 ? (
              <p className="mt-2">
                {`Vai gravar ${previa.datas.length} datas, de ${dataBr(previa.datas[0] ?? data)} até ${dataBr(previa.datas[previa.datas.length - 1] ?? data)}.`}
              </p>
            ) : null}
          </div>
        )}
        <Campo id="titulo" rotulo="Prazo">
          <input
            id="titulo"
            name="titulo"
            required
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
            className={classeCampo}
          />
        </Campo>
        <fieldset className="rounded-xl border border-line p-4">
          <legend className="px-2 text-lg font-semibold text-ink">
            Classificação
          </legend>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-lg text-ink">
              <input
                type="radio"
                name="defesa"
                value=""
                defaultChecked={!prazo?.defesa}
                className="h-5 w-5"
              />
              Prazo comum
            </label>
            <label className="flex items-center gap-2 rounded-xl bg-[#f3e9fb] px-3 py-2 text-lg text-ink">
              <input
                type="radio"
                name="defesa"
                value="1"
                defaultChecked={Boolean(prazo?.defesa)}
                className="h-5 w-5"
              />
              Defesa
            </label>
          </div>
          <p className="mt-3 text-base text-muted">
            Defesa, ou a palavra defesa no título, entra na aba Defesas e fica
            em lilás, no lugar da cor da área. Prazo cumprido continua vermelho.
          </p>
        </fieldset>
        <Campo id="observacao" rotulo="Observação">
          <textarea
            id="observacao"
            name="observacao"
            rows={5}
            value={observacao}
            onChange={(evento) => setObservacao(evento.target.value)}
            className={classeCampo}
          />
        </Campo>
        <Campo id="conteudo" rotulo="Conteúdo">
          <textarea
            id="conteudo"
            name="conteudo"
            rows={12}
            value={conteudo}
            onChange={(evento) => setConteudo(evento.target.value)}
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
        <Campo id="cumpridoEm" rotulo="Data / hora cumprido">
          <input
            id="cumpridoEm"
            name="cumpridoEm"
            type="datetime-local"
            defaultValue={prazo?.cumpridoEm ?? ""}
            className={classeCampo}
          />
        </Campo>
        <p className="ajuda-campo">
          Vale quando o status é cumprido. Em branco, grava o horário deste
          salvamento.
        </p>
        <CaixasAdvogados
          pessoas={responsaveis}
          marcados={advogadosMarcados}
          onChange={setAdvogadosMarcados}
        />
        <p className="ajuda-campo">Pelo menos um advogado.</p>
        {estado.erro ? (
          <p className="aviso aviso-erro" role="alert">
            {estado.erro}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pendente}
          className="btn btn-primario btn-cheio disabled:opacity-60"
        >
          {pendente ? "Salvando…" : "Salvar prazo"}
        </button>
      </form>
      {prazo?.id ? (
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
