export type ItemMenu = {
  href: string;
  rotulo: string;
};

export type GrupoMenu = {
  rotulo: string;
  itens: ItemMenu[];
};

export const menuPrincipal: Array<ItemMenu | GrupoMenu> = [
  { href: "/", rotulo: "Tela inicial" },
  { href: "/resumo", rotulo: "Resumo do dia" },
  { href: "/perguntar", rotulo: "Perguntar" },
  {
    rotulo: "Agenda",
    itens: [
      { href: "/agenda", rotulo: "Visualizar" },
      { href: "/agenda/nova", rotulo: "Adicionar novo" },
      { href: "/agenda/lista", rotulo: "Listar" },
    ],
  },
  { href: "/audiencias", rotulo: "Audiências" },
  { href: "/anos", rotulo: "Outros anos" },
  { href: "/conta", rotulo: "Alterar dados" },
];

export const menuAdmin: GrupoMenu[] = [
  {
    rotulo: "Prazos",
    itens: [
      { href: "/admin/prazos/novo", rotulo: "Adicionar novo" },
      { href: "/admin/prazos", rotulo: "Listar" },
      { href: "/admin/prazos/sem-advogado", rotulo: "Sem advogado" },
      { href: "/admin/prazos/tirar-advogado", rotulo: "Tirar advogado" },
    ],
  },
  {
    rotulo: "Audiências",
    itens: [
      { href: "/admin/audiencias/nova", rotulo: "Adicionar nova" },
      { href: "/admin/audiencias", rotulo: "Listar" },
    ],
  },
  {
    rotulo: "Usuários",
    itens: [
      { href: "/admin/usuarios/novo", rotulo: "Adicionar novo" },
      { href: "/admin/usuarios", rotulo: "Listar" },
    ],
  },
];

export function itemAtivo(caminho: string, href: string) {
  if (href === "/") {
    return caminho === "/";
  }
  return caminho === href;
}
