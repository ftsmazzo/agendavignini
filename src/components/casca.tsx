"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { sair } from "@/app/sair/actions";
import { AlternarTema } from "@/components/alternar-tema";
import {
  type GrupoMenu,
  type ItemMenu,
  itemAtivo,
  menuAdmin,
  menuPrincipal,
} from "@/lib/navegacao";

function ehGrupo(item: ItemMenu | GrupoMenu): item is GrupoMenu {
  return "itens" in item;
}

const ICONES: Record<string, string> = {
  "/": "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  "/resumo": "M4 5h16M4 12h16M4 19h10",
  "/prazos/atraso": "M12 8v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  "/prazos/meus": "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  "/prazos/cumprir": "M5 12l5 5L20 7",
  "/perguntar":
    "M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.1-1.5 2.4M12 18h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  Agenda:
    "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  "/audiencias": "M12 3l9 5H3zM5 10v8M10 10v8M14 10v8M19 10v8M3 21h18",
  "/anos": "M4 4v16h16M8 16v-5M13 16V8M18 16v-9",
  "/conta":
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2L10 21h4l.6-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z",
  Prazos:
    "M9 11l3 3 8-8M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h10",
  Audiências: "M12 3l9 5H3zM5 10v8M10 10v8M14 10v8M19 10v8M3 21h18",
  Usuários:
    "M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20a6 6 0 0 1 12 0M14 20a5 5 0 0 1 8 0",
  "/admin/relatorios": "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7",
};

function Icone({ chave }: { chave: string }) {
  const caminho = ICONES[chave];
  if (!caminho) {
    return <span className="inline-block h-5 w-5" aria-hidden />;
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={caminho} />
    </svg>
  );
}

function Ligacao({
  href,
  rotulo,
  icone = true,
}: ItemMenu & { icone?: boolean }) {
  const caminho = usePathname();
  const ativo = itemAtivo(caminho, href);

  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
        ativo
          ? "bg-rail-active font-semibold text-rail-ink shadow-[inset_3px_0_0_var(--gold)]"
          : "text-rail-muted hover:bg-rail-active/60 hover:text-rail-ink"
      }`}
    >
      {icone ? <Icone chave={href} /> : null}
      {rotulo}
    </Link>
  );
}

function Grupo({ grupo }: { grupo: GrupoMenu }) {
  const caminho = usePathname();
  const contemAtivo = grupo.itens.some((item) => itemAtivo(caminho, item.href));
  const [aberto, setAberto] = useState(contemAtivo);

  useEffect(() => {
    if (contemAtivo) {
      setAberto(true);
    }
  }, [contemAtivo]);

  return (
    <details
      open={aberto}
      onToggle={(evento) => {
        setAberto(evento.currentTarget.open);
      }}
      className="group"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-rail-ink marker:content-none hover:bg-rail-active/60">
        <Icone chave={grupo.rotulo} />
        <span className="flex-1">{grupo.rotulo}</span>
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-rail-muted transition-transform group-open:rotate-90"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </summary>
      <div className="mt-1 mb-2 ml-5 space-y-0.5 border-l border-rail-line pl-3">
        {grupo.itens.map((item) => (
          <Ligacao
            key={item.href}
            href={item.href}
            rotulo={item.rotulo}
            icone={false}
          />
        ))}
      </div>
    </details>
  );
}

function iniciais(nome: string) {
  const partes = nome.split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.[0] ?? "";
  const ultima =
    partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return `${primeira}${ultima}`.toUpperCase();
}

export function Casca({
  children,
  usuario,
}: {
  children: ReactNode;
  usuario: { nome: string; admin: boolean };
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const caminho = usePathname();

  // biome-ignore lint/correctness/useExhaustiveDependencies: fecha o menu ao trocar de página
  useEffect(() => {
    setMenuAberto(false);
  }, [caminho]);

  return (
    <div className="min-h-full bg-paper text-ink">
      <div className="flex min-h-full">
        <aside
          className={`${menuAberto ? "flex" : "hidden"} fixed inset-y-0 left-0 z-30 w-60 flex-col bg-rail text-rail-ink shadow-alta md:sticky md:top-0 md:flex md:h-screen md:shadow-none`}
        >
          <div className="px-3 pt-4 pb-3">
            <Image
              src="/marca-coelho-vignini.png"
              alt="Coelho Vignini Advogados Associados"
              width={1024}
              height={576}
              priority
              className="h-16 w-full object-contain object-left"
            />
          </div>
          <form action="/busca" className="px-4 pb-4">
            <label htmlFor="busca" className="sr-only">
              Pesquisar prazo ou audiência
            </label>
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-rail-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                id="busca"
                name="q"
                type="search"
                placeholder="Buscar prazo ou audiência"
                className="w-full rounded-lg border border-rail-line bg-rail-active/50 py-2 pr-3 pl-9 text-sm text-rail-ink placeholder:text-rail-muted focus:border-gold focus:outline-none"
              />
            </div>
          </form>
          <nav
            aria-label="Principal"
            className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4"
          >
            {menuPrincipal.map((item) =>
              ehGrupo(item) ? (
                <Grupo key={item.rotulo} grupo={item} />
              ) : (
                <Ligacao
                  key={item.href}
                  href={item.href}
                  rotulo={item.rotulo}
                />
              ),
            )}
            {usuario.admin ? (
              <>
                <p className="mt-6 mb-1 px-3 text-xs font-bold tracking-[0.12em] text-gold uppercase">
                  Painel do administrador
                </p>
                {menuAdmin.map((grupo) => (
                  <Grupo key={grupo.rotulo} grupo={grupo} />
                ))}
                <Ligacao href="/admin/relatorios" rotulo="Relatórios" />
              </>
            ) : null}
          </nav>
          <div className="border-t border-rail-line px-4 py-3 text-xs text-rail-muted">
            Sistema interno · Coelho Vignini
          </div>
        </aside>

        {menuAberto ? (
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-20 bg-ink/50 backdrop-blur-sm md:hidden"
            onClick={() => setMenuAberto(false)}
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-sheet/85 px-4 py-2 backdrop-blur md:px-8">
            <button
              type="button"
              className="btn btn-pequeno md:hidden"
              aria-expanded={menuAberto}
              onClick={() => setMenuAberto((aberto) => !aberto)}
            >
              ☰ Menu
            </button>
            <p className="hidden text-sm text-muted md:block">
              Prazos, audiências e contatos
            </p>
            <div className="ml-auto flex items-center gap-3">
              <AlternarTema />
              <div className="hidden items-center gap-2.5 sm:flex">
                <span
                  className="grid h-9 w-9 place-items-center rounded-full bg-pen-soft text-sm font-bold text-pen"
                  aria-hidden="true"
                >
                  {iniciais(usuario.nome)}
                </span>
                <p className="text-sm leading-tight font-semibold text-ink">
                  {usuario.nome}
                  <span className="block text-xs font-medium text-muted">
                    {usuario.admin ? "Administrador" : "Advogado"}
                  </span>
                </p>
              </div>
              <form action={sair}>
                <button type="submit" className="btn btn-primario btn-pequeno">
                  Sair
                </button>
              </form>
            </div>
          </header>
          <main className="entrada flex-1 px-5 py-8 md:px-10 md:py-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
