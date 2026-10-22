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
import { numeroDoProcesso } from "@/lib/publicacao";

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
}: {
  valor: string;
  onChange: (valor: string) => void;
  onEscolher: (item: ProcessoCadastrado) => void;
}) {
  const [lista, setLista] = useState<ProcessoCadastrado[]>([]);
  const [aberto, setAberto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");
  const [puxando, setPuxando] = useState(false);
  const pedido = useRef(0);
  const numeroCompleto = numeroDoProcesso(valor.trim());
  const podeTribunal = numeroCompleto === valor.trim() && valor.trim() !== "";

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
    const timer = setTimeout(() => {
      setBuscando(true);
      void sugerirProcessos(termo).then((achados) => {
        if (pedido.current !== id) {
          return;
        }
        setLista(achados);
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

  async function puxarTribunal() {
    if (!podeTribunal || puxando) {
      return;
    }
    setPuxando(true);
    setErro("");
    setAviso("");
    const resultado = await puxarCamposDoTribunal(valor.trim());
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
          setAviso("");
          setErro("");
          onChange(evento.target.value);
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
        Digite o número, a parte ou a vara. A lista mostra processos já lançados
        no escritório.
      </p>
      {buscando ? (
        <p className="mt-2 text-base text-muted">Buscando processos.</p>
      ) : null}
      {aberto && !buscando && lista.length === 0 && valor.trim().length >= 3 ? (
        <p className="aviso mt-3">
          Nenhum processo cadastrado com esse trecho.
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
      {podeTribunal ? (
        <button
          type="button"
          disabled={puxando}
          onClick={() => void puxarTribunal()}
          className="btn-texto mt-3 disabled:opacity-60"
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
        {audiencia ? "Editar audiência" : "Adicionar audiência"}
      </h1>
      <form action={acao} className="cartao mt-6 space-y-5 p-5 md:p-7">
        {audiencia ? (
          <input type="hidden" name="id" value={audiencia.id} />
        ) : null}
        <Campo id="numeroProcesso" rotulo="Núm. processo">
          <CampoProcesso
            valor={campos.numeroProcesso}
            onChange={(numeroProcesso) =>
              setCampos((atual) => ({ ...atual, numeroProcesso }))
            }
            onEscolher={(item) =>
              setCampos((atual) => aplicarProcesso(atual, item))
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
          <Campo id="local" rotulo="Local">
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
