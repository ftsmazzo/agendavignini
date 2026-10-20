type ParametroTool = {
  nome: string;
  tipo: string;
  obrigatorio: boolean;
  descricao: string;
};

type ToolMcp = {
  name: string;
  description: string;
  parameters: ParametroTool[];
};

export const TOOLS_MCP: ToolMcp[] = [
  {
    name: "catalogo",
    description:
      "Lista as tools de leitura da Agenda Coelho Vignini e seus parâmetros. Use no início da conversa.",
    parameters: [],
  },
  {
    name: "contagem_painel",
    description:
      "Contadores do escritório para uma data: prazos do dia, da semana, em atraso e audiências da semana.",
    parameters: [
      {
        nome: "data",
        tipo: "string",
        obrigatorio: false,
        descricao: "Data ISO YYYY-MM-DD. Padrão: hoje no escritório.",
      },
    ],
  },
  {
    name: "prazos_hoje",
    description:
      "Lista os prazos do dia (título, área, situação, processo). Não devolve a publicação inteira.",
    parameters: [
      {
        nome: "data",
        tipo: "string",
        obrigatorio: false,
        descricao: "Data ISO YYYY-MM-DD. Padrão: hoje.",
      },
      {
        nome: "usuario_id",
        tipo: "number",
        obrigatorio: false,
        descricao:
          "Filtra pelos prazos vinculados a este advogado. No perfil pessoal é ignorado.",
      },
      {
        nome: "situacao",
        tipo: "string",
        obrigatorio: false,
        descricao: "aberto | cumprido. Vazio = todos.",
      },
      {
        nome: "limite",
        tipo: "number",
        obrigatorio: false,
        descricao: "Máximo de itens (1–80). Padrão 40.",
      },
    ],
  },
  {
    name: "prazos_semana",
    description: "Prazos da semana ISO da data informada (segunda a domingo).",
    parameters: [
      {
        nome: "data",
        tipo: "string",
        obrigatorio: false,
        descricao: "Qualquer dia da semana desejada. Padrão: hoje.",
      },
      {
        nome: "usuario_id",
        tipo: "number",
        obrigatorio: false,
        descricao: "Filtra por advogado vinculado.",
      },
      {
        nome: "limite",
        tipo: "number",
        obrigatorio: false,
        descricao: "Máximo de itens (1–120). Padrão 60.",
      },
    ],
  },
  {
    name: "prazos_atraso",
    description: "Prazos em aberto com data anterior a hoje (ou à data base).",
    parameters: [
      {
        nome: "data",
        tipo: "string",
        obrigatorio: false,
        descricao: "Data base ISO. Padrão: hoje.",
      },
      {
        nome: "usuario_id",
        tipo: "number",
        obrigatorio: false,
        descricao: "Filtra por advogado vinculado.",
      },
      {
        nome: "limite",
        tipo: "number",
        obrigatorio: false,
        descricao: "Máximo de itens (1–100). Padrão 50.",
      },
    ],
  },
  {
    name: "prazo_detalhe",
    description:
      "Detalhe de um prazo por id: publicação (recortada), observação, responsáveis e cumprimento.",
    parameters: [
      {
        nome: "id",
        tipo: "number",
        obrigatorio: true,
        descricao: "Id numérico do prazo.",
      },
    ],
  },
  {
    name: "buscar_publicacao",
    description:
      "Busca textual em título, observação e conteúdo de publicações (DJ).",
    parameters: [
      {
        nome: "q",
        tipo: "string",
        obrigatorio: true,
        descricao: "Termo de busca (parte, processo, tema).",
      },
      {
        nome: "limite",
        tipo: "number",
        obrigatorio: false,
        descricao: "Máximo de itens (1–40). Padrão 20.",
      },
    ],
  },
  {
    name: "prazos_por_processo",
    description:
      "Prazos cujo título, observação ou conteúdo citam o número do processo.",
    parameters: [
      {
        nome: "processo",
        tipo: "string",
        obrigatorio: true,
        descricao: "Número CNJ ou trecho numérico do processo.",
      },
      {
        nome: "limite",
        tipo: "number",
        obrigatorio: false,
        descricao: "Máximo de itens (1–40). Padrão 20.",
      },
    ],
  },
  {
    name: "audiencias_hoje",
    description: "Audiências do dia no fuso America/Sao_Paulo.",
    parameters: [
      {
        nome: "data",
        tipo: "string",
        obrigatorio: false,
        descricao: "Data ISO. Padrão: hoje.",
      },
      {
        nome: "usuario_id",
        tipo: "number",
        obrigatorio: false,
        descricao: "Filtra por advogado vinculado.",
      },
    ],
  },
  {
    name: "audiencias_intervalo",
    description: "Audiências entre duas datas (inclusive).",
    parameters: [
      {
        nome: "inicio",
        tipo: "string",
        obrigatorio: true,
        descricao: "Data inicial ISO YYYY-MM-DD.",
      },
      {
        nome: "fim",
        tipo: "string",
        obrigatorio: true,
        descricao: "Data final ISO YYYY-MM-DD.",
      },
      {
        nome: "usuario_id",
        tipo: "number",
        obrigatorio: false,
        descricao: "Filtra por advogado vinculado.",
      },
      {
        nome: "limite",
        tipo: "number",
        obrigatorio: false,
        descricao: "Máximo de itens (1–80). Padrão 40.",
      },
    ],
  },
  {
    name: "audiencia_detalhe",
    description:
      "Detalhe de uma audiência: processo, vara, local, partes, modalidade e observação.",
    parameters: [
      {
        nome: "id",
        tipo: "number",
        obrigatorio: true,
        descricao: "Id numérico da audiência.",
      },
    ],
  },
  {
    name: "resumo_dia_usuario",
    description:
      "Mesmo agregado do e-mail da manhã: prazos e audiências vinculados a um advogado num dia.",
    parameters: [
      {
        nome: "usuario_id",
        tipo: "number",
        obrigatorio: false,
        descricao:
          "Id do advogado. No perfil pessoal usa o dono do token. No escritório é obrigatório.",
      },
      {
        nome: "data",
        tipo: "string",
        obrigatorio: false,
        descricao: "Data ISO. Padrão: hoje.",
      },
    ],
  },
  {
    name: "contatos_buscar",
    description:
      "Busca contatos da agenda telefônica por nome. Telefone e e-mail vêm mascarados parcialmente.",
    parameters: [
      {
        nome: "q",
        tipo: "string",
        obrigatorio: true,
        descricao: "Nome ou trecho do contato.",
      },
      {
        nome: "limite",
        tipo: "number",
        obrigatorio: false,
        descricao: "Máximo de itens (1–30). Padrão 15.",
      },
    ],
  },
];
