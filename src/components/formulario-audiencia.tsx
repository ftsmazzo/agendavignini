"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  excluirAudiencia,
  puxarCamposDoTribunal,
  salvarAudiencia,
  sugerirProcessos,
} from "@/app/(painel)/admin/audiencias/actions";
import { BotaoExcluir } from "@/components/botao-excluir";
import { CaixasAdvogados } from "@/components/caixas-advogados";
import { Campo, classeCampo } from "@/components/campo";
import { Seta } from "@/components/seta";
import type { ProcessoCadastrado } from "@/lib/processos-cadastrados";
import { formatarProcesso } from "@/lib/publicacao";

type Pessoa = { id: number; nome: string };

type Campos = {
  numeroProcesso: string;
  vara: string;
  local: string;
  reclamante: string;
  reclamado: string;
  preposto: string;
};

function aplicarProcesso(atual: Campos, item: ProcessoCadastrado): Campos {
  return {
    numeroProcesso: item.numero,
    vara: item.vara || atual.vara,
    local: item.local || atual.local,
    reclamante: item.reclamante || atual.reclamante,
    reclamado: item.reclamado || atual.reclamado,
    preposto: item.preposto || atual.preposto,
  };
}

function CampoProcesso({
  valor,
  onChange,
  onEscolher,
  onLimpar,
}: {
  valor: string;
  onChange: (valor: string) => void;
  onEscolher: (item: ProcessoCadastrado) => void;
  onLimpar: () => void;
}) {
  const [lista, setLista] = useState<ProcessoCadastrado[]>([]);
  const [aberto, setAberto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");
  const [puxando, setPuxando] = useState(false);
  const pedido = useRef(0);
  const consultado = useRef("");
  const numeroConsulta = formatarProcesso(valor.trim()) ?? "";

  useEffect(() => {
    const termo = valor.trim();
    if (termo.length < 3) {
      setLista([]);
      setAberto(false);
      setBuscando(false);
      return;
    }
    const id = pedido.current + 1;
    pedido.current = id;
    setBuscando(true);
    const timer = setTimeout(() => {
      void sugerirProcessos(termo)
        .then((achados) => {
          if (pedido.current !== id) {
            return;
          }
          setLista(achados);
          setAberto(true);
          setBuscando(false);
        })
        .catch(() => {
          if (pedido.current !== id) {
            return;
          }
          setLista([]);
          setAberto(true);
          setBuscando(false);
        });
    }, 280);
    return () => clearTimeout(timer);
  }, [valor]);

  function escolher(item: ProcessoCadastrado) {
    onEscolher(item);
    setAberto(false);
    setErro("");
    setAviso(
      item.vara || item.reclamante || item.reclamado
        ? "Campos preenchidos com a última audiência desse processo."
        : "Processo encontrado nos prazos. Vara e partes ainda não estão lançadas.",
    );
  }

  async function puxarTribunal(numero = numeroConsulta) {
    if (!numero || puxando) {
      return;
    }
    consultado.current = numero;
    setPuxando(true);
    setErro("");
    setAviso("");
    if (valor.trim() !== numero) {
      onChange(numero);
    }
    const resultado = await puxarCamposDoTribunal(numero);
    setPuxando(false);
    if (resultado.erro || !resultado.campos) {
      setErro(
        resultado.erro ||
          "O tribunal não devolveu vara nem partes. Preencha os campos.",
      );
      return;
    }
    onEscolher({ ...resultado.campos, preposto: "", detalhe: "" });
    setAviso("Vara e partes preenchidas com a consulta do tribunal.");
    setAberto(false);
  }

  const puxarAtual = useRef(puxarTribunal);
  puxarAtual.current = puxarTribunal;

  useEffect(() => {
    if (!numeroConsulta || buscando || !aberto || lista.length > 0) {
      return;
    }
    if (consultado.current === numeroConsulta) {
      return;
    }
    consultado.current = numeroConsulta;
    void puxarAtual.current(numeroConsulta);
  }, [numeroConsulta, buscando, aberto, lista.length]);

  return (
    <div className="relative">
      <input
        id="numeroProcesso"
        name="numeroProcesso"
        value={valor}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={aberto}
        aria-controls="processos-cadastrados"
        autoComplete="off"
        onChange={(evento) => {
          const proximo = evento.target.value;
          setAviso("");
          setErro("");
          if (proximo.trim() === "" && valor.trim() !== "") {
            consultado.current = "";
            onLimpar();
          }
          onChange(proximo);
        }}
        onFocus={() => {
          if (lista.length > 0) {
            setAberto(true);
          }
        }}
        onKeyDown={(evento) => {
          if (evento.key === "Escape") {
            setAberto(false);
          }
        }}
        className={classeCampo}
      />
      <p className="mt-2 text-base text-muted">
        Digite o número, a parte ou a vara. Se o processo não estiver no
        escritório, o número completo consulta o tribunal e preenche vara e
        partes.
      </p>
      {buscando ? (
        <p className="mt-2 text-base text-muted">Buscando processos.</p>
      ) : null}
      {aberto &&
      !buscando &&
      lista.length === 0 &&
      !numeroConsulta &&
      valor.trim().length >= 3 ? (
        <p className="aviso mt-3">
          Nenhum processo cadastrado com esse trecho. Informe o número completo
          para consultar o tribunal.
        </p>
      ) : null}
      {aberto && lista.length > 0 ? (
        <div
          id="processos-cadastrados"
          role="listbox"
          className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-line bg-paper shadow-lg"
        >
          {lista.map((item) => {
            const partes = [item.reclamante, item.reclamado]
              .filter(Boolean)
              .join(" · ");
            return (
              <button
                key={item.numero}
                type="button"
                role="option"
                className="block w-full px-4 py-3 text-left hover:bg-line/40"
                onMouseDown={(evento) => evento.preventDefault()}
                onClick={() => escolher(item)}
              >
                <span className="block text-lg font-semibold text-ink">
                  {item.numero}
                </span>
                <span className="mt-1 block text-base text-muted">
                  {partes || item.detalhe || item.vara || "Processo lançado"}
                  {item.vara && partes ? ` · ${item.vara}` : ""}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
      {numeroConsulta ? (
        <button
          type="button"
          disabled={puxando}
          onClick={() => void puxarTribunal(numeroConsulta)}
          className="btn btn-pequeno mt-3 disabled:opacity-60"
        >
          {puxando
            ? "Consultando o tribunal."
            : "Puxar vara e partes no tribunal"}
        </button>
      ) : null}
      {aviso ? <p className="aviso aviso-ok mt-3">{aviso}</p> : null}
      {erro ? (
        <p className="aviso aviso-erro mt-3" role="alert">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

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
    tipo: string;
    modalidade: string;
    ato: string;
    observacao: string;
  };
  responsaveis: Pessoa[];
  advogados: number[];
}) {
  const [estado, acao, pendente] = useActionState(salvarAudiencia, {
    erro: "",
  });
  const [tipo, setTipo] = useState(
    audiencia?.tipo === "pericia" ? "pericia" : "audiencia",
  );
  const pericia = tipo === "pericia";
  const [campos, setCampos] = useState<Campos>({
    numeroProcesso: audiencia?.numeroProcesso ?? "",
    vara: audiencia?.vara ?? "",
    local: audiencia?.local ?? "",
    reclamante: audiencia?.reclamante ?? "",
    reclamado: audiencia?.reclamado ?? "",
    preposto: audiencia?.preposto ?? "",
  });

  return (
    <div className="entrada mx-auto w-full max-w-3xl">
      <Link href="/admin/audiencias" className="btn-texto">
        <Seta />
        Voltar às audiências
      </Link>
      <h1 className="titulo-pagina mt-2">
        {audiencia
          ? pericia
            ? "Editar perícia"
            : "Editar audiência"
          : pericia
            ? "Adicionar perícia"
            : "Adicionar audiência"}
      </h1>
      <form action={acao} className="cartao mt-6 space-y-5 p-5 md:p-7">
        {audiencia ? (
          <input type="hidden" name="id" value={audiencia.id} />
        ) : null}
        <fieldset className="rounded-xl border border-line p-4">
          <legend className="px-2 text-lg font-semibold text-ink">Tipo</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-lg text-ink">
              <input
                type="radio"
                name="tipo"
                value="audiencia"
                checked={tipo === "audiencia"}
                onChange={() => setTipo("audiencia")}
                className="h-5 w-5"
              />
              Audiência
            </label>
            <label className="flex items-center gap-2 rounded-xl bg-hearing-soft px-3 py-2 text-lg text-ink">
              <input
                type="radio"
                name="tipo"
                value="pericia"
                checked={tipo === "pericia"}
                onChange={() => setTipo("pericia")}
                className="h-5 w-5"
              />
              Perícia
            </label>
          </div>
          <p className="mt-3 text-base text-muted">
            A perícia entra na mesma lista, com os mesmos advogados. O local
            registra onde ela será realizada.
          </p>
        </fieldset>
        <Campo id="numeroProcesso" rotulo="Núm. processo">
          <CampoProcesso
            valor={campos.numeroProcesso}
            onChange={(numeroProcesso) =>
              setCampos((atual) => ({ ...atual, numeroProcesso }))
            }
            onEscolher={(item) =>
              setCampos((atual) => aplicarProcesso(atual, item))
            }
            onLimpar={() =>
              setCampos((atual) => ({
                ...atual,
                numeroProcesso: "",
                vara: "",
                local: "",
                reclamante: "",
                reclamado: "",
                preposto: "",
              }))
            }
          />
        </Campo>
        <div className="grid gap-5 md:grid-cols-2">
          <Campo id="vara" rotulo="Vara">
            <input
              id="vara"
              name="vara"
              value={campos.vara}
              onChange={(evento) =>
                setCampos((atual) => ({ ...atual, vara: evento.target.value }))
              }
              className={classeCampo}
            />
          </Campo>
          <Campo id="local" rotulo={pericia ? "Local da perícia" : "Local"}>
            <input
              id="local"
              name="local"
              value={campos.local}
              onChange={(evento) =>
                setCampos((atual) => ({
                  ...atual,
                  local: evento.target.value,
                }))
              }
              placeholder="Onde será realizada"
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
              value={campos.reclamante}
              onChange={(evento) =>
                setCampos((atual) => ({
                  ...atual,
                  reclamante: evento.target.value,
                }))
              }
              className={classeCampo}
            />
          </Campo>
          <Campo id="reclamado" rotulo="Reclamado">
            <input
              id="reclamado"
              name="reclamado"
              value={campos.reclamado}
              onChange={(evento) =>
                setCampos((atual) => ({
                  ...atual,
                  reclamado: evento.target.value,
                }))
              }
              className={classeCampo}
            />
          </Campo>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Campo id="modalidade" rotulo="Forma">
            <select
              id="modalidade"
              name="modalidade"
              defaultValue={audiencia?.modalidade ?? ""}
              className={classeCampo}
            >
              <option value="">Sem classificação</option>
              <option value="presencial">Presencial</option>
              <option value="telepresencial">Telepresencial</option>
              <option value="hibrida">Híbrida</option>
            </select>
          </Campo>
          <Campo id="ato" rotulo="Modalidade">
            <select
              id="ato"
              name="ato"
              defaultValue={audiencia?.ato ?? ""}
              className={classeCampo}
            >
              <option value="">Sem modalidade</option>
              <option value="inicial">Inicial</option>
              <option value="una">Una</option>
              <option value="instrucao">Instrução</option>
              <option value="conciliacao">Conciliação</option>
            </select>
          </Campo>
        </div>
        <Campo id="preposto" rotulo="Preposto">
          <input
            id="preposto"
            name="preposto"
            value={campos.preposto}
            onChange={(evento) =>
              setCampos((atual) => ({
                ...atual,
                preposto: evento.target.value,
              }))
            }
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
          <p className="aviso aviso-erro" role="alert">
            {estado.erro}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pendente}
          className="btn btn-primario btn-cheio disabled:opacity-60"
        >
          {pendente
            ? "Salvando…"
            : pericia
              ? "Salvar perícia"
              : "Salvar audiência"}
        </button>
      </form>
      {audiencia ? (
        <div className="mt-4">
          <BotaoExcluir
            action={excluirAudiencia}
            pergunta={
              pericia ? "Excluir esta perícia?" : "Excluir esta audiência?"
            }
            rotulo={pericia ? "Excluir perícia" : "Excluir audiência"}
          >
            <input type="hidden" name="id" value={audiencia.id} />
          </BotaoExcluir>
        </div>
      ) : null}
    </div>
  );
}
