"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  type Guia,
  guiaPorId,
  type Opcao,
  responder,
  sugestoes,
} from "@/lib/suporte";

type Bolha =
  | { id: number; papel: "voce"; texto: string }
  | {
      id: number;
      papel: "ajuda";
      texto: string;
      guia?: Guia;
      soAdmin?: boolean;
      opcoes?: Opcao[];
    };

const CHAVE = "agenda-ajuda";

function lerSessao(): { aberto: boolean; bolhas: Bolha[] } | null {
  try {
    const cru = sessionStorage.getItem(CHAVE);
    if (!cru) {
      return null;
    }
    const dado = JSON.parse(cru) as { aberto?: boolean; bolhas?: Bolha[] };
    if (!Array.isArray(dado.bolhas)) {
      return null;
    }
    return { aberto: Boolean(dado.aberto), bolhas: dado.bolhas.slice(-24) };
  } catch {
    return null;
  }
}

export function ChatSuporte({ admin }: { admin: boolean }) {
  const tituloId = useId();
  const campoId = useId();
  const lista = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const sequencia = useRef(1);
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [bolhas, setBolhas] = useState<Bolha[]>([]);
  const [pronto, setPronto] = useState(false);
  const chips = sugestoes(admin);

  useEffect(() => {
    const sessao = lerSessao();
    if (sessao) {
      setAberto(sessao.aberto);
      setBolhas(sessao.bolhas);
      const maior = sessao.bolhas.reduce(
        (atual, item) => Math.max(atual, item.id),
        0,
      );
      sequencia.current = maior + 1;
    }
    setPronto(true);
  }, []);

  useEffect(() => {
    if (!pronto) {
      return;
    }
    sessionStorage.setItem(CHAVE, JSON.stringify({ aberto, bolhas }));
  }, [aberto, bolhas, pronto]);

  const quantidade = bolhas.length;
  useEffect(() => {
    if (!aberto) {
      return;
    }
    if (quantidade > 0) {
      lista.current?.scrollTo({ top: lista.current.scrollHeight });
    }
    campo.current?.focus();
  }, [aberto, quantidade]);

  function proximoId() {
    const id = sequencia.current;
    sequencia.current += 1;
    return id;
  }

  function acrescentar(novas: Bolha[]) {
    setBolhas((atual) => [...atual, ...novas].slice(-24));
  }

  function abrirGuia(id: string, pergunta: string) {
    const guia = guiaPorId(id);
    if (!guia) {
      return;
    }
    acrescentar([
      { id: proximoId(), papel: "voce", texto: pergunta },
      {
        id: proximoId(),
        papel: "ajuda",
        texto: guia.abertura,
        guia,
        soAdmin: guia.admin && !admin,
      },
    ]);
  }

  function enviar(bruto: string) {
    const pergunta = bruto.trim();
    if (!pergunta) {
      return;
    }
    setTexto("");
    const resposta = responder(pergunta, admin);
    if (resposta.tipo === "guia") {
      acrescentar([
        { id: proximoId(), papel: "voce", texto: pergunta },
        {
          id: proximoId(),
          papel: "ajuda",
          texto: resposta.guia.abertura,
          guia: resposta.guia,
          soAdmin: resposta.soAdmin,
        },
      ]);
      return;
    }
    acrescentar([
      { id: proximoId(), papel: "voce", texto: pergunta },
      {
        id: proximoId(),
        papel: "ajuda",
        texto: resposta.texto,
        opcoes: resposta.opcoes,
      },
    ]);
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3">
      {aberto ? (
        <section
          role="dialog"
          aria-labelledby={tituloId}
          className="pointer-events-auto flex max-h-[min(36rem,calc(100vh-6.5rem))] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-sheet text-ink shadow-alta"
        >
          <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 id={tituloId} className="text-base font-semibold">
                Ajuda
              </h2>
              <p className="text-sm text-muted">
                Mostra a tela e o botão. Não altera prazo, audiência nem
                contato.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-pequeno"
              onClick={() => setAberto(false)}
            >
              Fechar
            </button>
          </header>
          <div
            ref={lista}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {bolhas.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed">
                  Pergunte com suas palavras. Por exemplo: como cumpro um prazo,
                  ou como crio uma audiência.
                </p>
                <div className="flex flex-wrap gap-2">
                  {chips.map((opcao) => (
                    <button
                      key={opcao.id}
                      type="button"
                      className="rounded-full border border-line bg-paper px-3 py-1.5 text-left text-sm text-ink hover:border-pen"
                      onClick={() => abrirGuia(opcao.id, opcao.titulo)}
                    >
                      {opcao.titulo}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              bolhas.map((bolha) =>
                bolha.papel === "voce" ? (
                  <p
                    key={bolha.id}
                    className="ml-8 rounded-2xl bg-pen px-3 py-2 text-sm text-pen-ink"
                  >
                    {bolha.texto}
                  </p>
                ) : (
                  <article
                    key={bolha.id}
                    className="mr-4 rounded-2xl border border-line bg-paper px-3 py-3 text-sm leading-relaxed"
                  >
                    {bolha.soAdmin ? (
                      <p className="mb-2 rounded-lg bg-pen-soft px-3 py-2 text-pen">
                        Esta tela é do administrador. Se o seu menu não tem
                        Painel do administrador, peça a quem administra a
                        agenda.
                      </p>
                    ) : null}
                    <p>{bolha.texto}</p>
                    {bolha.guia ? (
                      <>
                        <ol className="mt-3 list-decimal space-y-3 pl-5">
                          {bolha.guia.passos.map((passo) => (
                            <li key={passo.texto}>
                              {passo.texto}
                              {passo.href && passo.rotulo ? (
                                <Link
                                  href={passo.href}
                                  className="btn btn-pequeno mt-2"
                                >
                                  {passo.rotulo}
                                </Link>
                              ) : null}
                            </li>
                          ))}
                        </ol>
                        <p className="mt-3 text-muted">
                          O link abre a tela e esta janela continua aqui.
                        </p>
                        {bolha.guia.relacionados.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {bolha.guia.relacionados.map((id) => {
                              const guia = guiaPorId(id);
                              if (!guia) {
                                return null;
                              }
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  className="rounded-full border border-line px-3 py-1 text-left text-xs hover:border-pen"
                                  onClick={() =>
                                    abrirGuia(guia.id, guia.titulo)
                                  }
                                >
                                  {guia.titulo}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    {bolha.opcoes ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {bolha.opcoes.map((opcao) => (
                          <button
                            key={opcao.id}
                            type="button"
                            className="rounded-full border border-line bg-sheet px-3 py-1.5 text-left text-sm hover:border-pen"
                            onClick={() => abrirGuia(opcao.id, opcao.titulo)}
                          >
                            {opcao.titulo}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ),
              )
            )}
          </div>
          <form
            className="flex items-end gap-2 border-t border-line px-3 py-3"
            onSubmit={(evento) => {
              evento.preventDefault();
              enviar(texto);
            }}
          >
            <label htmlFor={campoId} className="sr-only">
              Sua pergunta
            </label>
            <textarea
              ref={campo}
              id={campoId}
              rows={2}
              value={texto}
              placeholder="Como cumpro um prazo?"
              className="campo min-h-11 flex-1 resize-none py-2"
              onChange={(evento) => setTexto(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter" && !evento.shiftKey) {
                  evento.preventDefault();
                  enviar(texto);
                }
                if (evento.key === "Escape") {
                  setAberto(false);
                }
              }}
            />
            <button type="submit" className="btn btn-primario btn-pequeno">
              Enviar
            </button>
          </form>
        </section>
      ) : null}
      <button
        type="button"
        className="pointer-events-auto btn btn-primario shadow-alta"
        aria-expanded={aberto}
        onClick={() => setAberto((atual) => !atual)}
      >
        {aberto ? "Ocultar ajuda" : "Ajuda"}
      </button>
    </div>
  );
}
