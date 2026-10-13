"use client";

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

function Ligacao({ href, rotulo }: ItemMenu) {
  const caminho = usePathname();
  const ativo = itemAtivo(caminho, href);

  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={
        ativo
          ? "block bg-rail-active px-5 py-3 font-semibold text-rail-ink"
          : "block px-5 py-3 text-rail-ink hover:bg-rail-active"
      }
    >
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
      <summary className="cursor-pointer list-none px-5 py-3 font-semibold text-rail-ink marker:content-none">
        <span className="flex items-center justify-between gap-3">
          {grupo.rotulo}
          <span className="text-rail-muted group-open:hidden" aria-hidden>
            +
          </span>
          <span
            className="hidden text-rail-muted group-open:inline"
            aria-hidden
          >
            –
          </span>
        </span>
      </summary>
      <div className="border-l border-rail-line ml-6">
        {grupo.itens.map((item) => (
          <Ligacao key={item.href} href={item.href} rotulo={item.rotulo} />
        ))}
      </div>
    </details>
  );
}

export function Casca({
  children,
  usuario,
}: {
  children: ReactNode;
  usuario: { nome: string; admin: boolean };
}) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="min-h-full bg-paper text-ink">
      <div className="flex min-h-full">
        <aside
          className={`${menuAberto ? "flex" : "hidden"} fixed inset-y-0 left-0 z-20 w-80 flex-col bg-rail text-rail-ink md:static md:flex`}
        >
          <div className="border-b border-rail-line px-5 py-6">
            <p className="text-3xl leading-none font-bold">Coelho Vignini</p>
            <p className="mt-2 text-lg text-rail-muted">Agenda do escritório</p>
          </div>
          <form action="/busca" className="border-b border-rail-line p-4">
            <label htmlFor="busca" className="sr-only">
              Pesquisar um prazo
            </label>
            <input
              id="busca"
              name="q"
              type="search"
              placeholder="Pesquisar um prazo"
              className="w-full border border-rail-line bg-rail-active px-4 py-3 text-lg text-rail-ink placeholder:text-rail-muted"
            />
          </form>
          <nav
            aria-label="Principal"
            className="flex-1 overflow-y-auto py-3 text-lg"
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
                <p className="mt-6 px-5 py-3 text-lg font-semibold text-rail-muted">
                  Painel do administrador
                </p>
                {menuAdmin.map((grupo) => (
                  <Grupo key={grupo.rotulo} grupo={grupo} />
                ))}
                <Ligacao href="/admin/relatorios" rotulo="Relatórios" />
              </>
            ) : null}
          </nav>
        </aside>

        {menuAberto ? (
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-10 bg-ink/40 md:hidden"
            onClick={() => setMenuAberto(false)}
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-line bg-sheet px-5 py-4">
            <button
              type="button"
              className="border border-line px-4 py-3 text-lg md:hidden"
              aria-expanded={menuAberto}
              onClick={() => setMenuAberto((aberto) => !aberto)}
            >
              Menu
            </button>
            <p className="hidden text-lg text-muted md:block">
              Prazos, audiências e contatos
            </p>
            <div className="ml-auto flex items-center gap-3">
              <AlternarTema />
              <p className="text-lg text-ink">{usuario.nome}</p>
              <form action={sair}>
                <button
                  type="submit"
                  className="bg-pen px-4 py-3 text-lg font-semibold text-sheet"
                >
                  Sair
                </button>
              </form>
            </div>
          </header>
          <main className="flex-1 px-5 py-8 md:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
