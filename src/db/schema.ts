import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Modelo novo, pensado para receber o MySQL legado.
 * Ids numéricos preservam o vínculo na carga.
 * `prazos.status` legado (0 ou id de usuário) vira `situacao` + `cumprido_por_id`.
 * Datas 0000-00-00 do dump viram nulo na importação.
 */

export const papel = pgEnum("papel", ["admin", "usuario"]);
export const areaPrazo = pgEnum("area_prazo", [
  "administrativo",
  "civil",
  "trabalhista",
]);
export const situacaoPrazo = pgEnum("situacao_prazo", ["aberto", "cumprido"]);
export const algoritmoSenha = pgEnum("algoritmo_senha", ["md5", "argon2id"]);

export const usuarios = pgTable("usuarios", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  nome: text("nome").notNull(),
  sobrenome: text("sobrenome").notNull().default(""),
  email: text("email"),
  celular: text("celular"),
  login: text("login").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  algoritmoSenha: algoritmoSenha("algoritmo_senha")
    .notNull()
    .default("argon2id"),
  ativo: boolean("ativo").notNull().default(true),
  entraNoRelatorio: boolean("entra_no_relatorio").notNull().default(false),
  papel: papel("papel").notNull().default("usuario"),
});

export const contatos = pgTable("contatos", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  nome: text("nome").notNull(),
  telefone: text("telefone").notNull().default(""),
  celular: text("celular"),
  email: text("email"),
  endereco: text("endereco"),
  nascimento: date("nascimento"),
});

export const prazos = pgTable(
  "prazos",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    area: areaPrazo("area").notNull(),
    data: date("data").notNull(),
    observacao: text("observacao").notNull().default(""),
    conteudo: text("conteudo").notNull().default(""),
    titulo: text("titulo").notNull(),
    defesa: boolean("defesa").notNull().default(false),
    situacao: situacaoPrazo("situacao").notNull().default("aberto"),
    cumpridoPorId: integer("cumprido_por_id").references(() => usuarios.id),
    cumpridoEm: timestamp("cumprido_em", { withTimezone: true }),
  },
  (tabela) => [index("prazos_data_idx").on(tabela.data)],
);

export const prazosUsuarios = pgTable(
  "prazos_usuarios",
  {
    prazoId: integer("prazo_id")
      .notNull()
      .references(() => prazos.id, { onDelete: "cascade" }),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id),
  },
  (tabela) => [
    primaryKey({ columns: [tabela.prazoId, tabela.usuarioId] }),
    index("prazos_usuarios_usuario_idx").on(tabela.usuarioId),
  ],
);

export const audiencias = pgTable(
  "audiencias",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    numeroProcesso: text("numero_processo").notNull().default(""),
    vara: text("vara").notNull().default(""),
    local: text("local").notNull().default(""),
    reclamante: text("reclamante"),
    reclamado: text("reclamado"),
    preposto: text("preposto"),
    dataHora: timestamp("data_hora", { withTimezone: true }).notNull(),
    modalidade: text("modalidade"),
    ato: text("ato"),
    observacao: text("observacao"),
  },
  (tabela) => [index("audiencias_data_hora_idx").on(tabela.dataHora)],
);

export const audienciasUsuarios = pgTable(
  "audiencias_usuarios",
  {
    audienciaId: integer("audiencia_id")
      .notNull()
      .references(() => audiencias.id, { onDelete: "cascade" }),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id),
  },
  (tabela) => [primaryKey({ columns: [tabela.audienciaId, tabela.usuarioId] })],
);

export const notificacoes = pgTable(
  "notificacoes",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    prazoId: integer("prazo_id").references(() => prazos.id, {
      onDelete: "set null",
    }),
    titulo: text("titulo").notNull(),
    dataAnterior: date("data_anterior").notNull(),
    dataNova: date("data_nova").notNull(),
    atorId: integer("ator_id").references(() => usuarios.id, {
      onDelete: "set null",
    }),
    lida: boolean("lida").notNull().default(false),
    criadaEm: timestamp("criada_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (tabela) => [
    index("notificacoes_usuario_idx").on(tabela.usuarioId, tabela.lida),
  ],
);

export const auditoria = pgTable(
  "auditoria",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    atorId: integer("ator_id").references(() => usuarios.id),
    acao: text("acao").notNull(),
    entidade: text("entidade").notNull(),
    entidadeId: text("entidade_id").notNull(),
    em: timestamp("em", { withTimezone: true }).notNull().defaultNow(),
    detalhe: text("detalhe"),
  },
  (tabela) => [
    index("auditoria_entidade_idx").on(tabela.entidade, tabela.entidadeId),
  ],
);

/** Tokens Bearer só de leitura para Claude, GPT e similares. */
export const mcpTokens = pgTable(
  "mcp_tokens",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    nome: text("nome").notNull(),
    prefixo: text("prefixo").notNull().unique(),
    tokenHash: text("token_hash").notNull().unique(),
    perfil: text("perfil").notNull(),
    usuarioId: integer("usuario_id").references(() => usuarios.id, {
      onDelete: "set null",
    }),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ultimoUso: timestamp("ultimo_uso", { withTimezone: true }),
    usoTotal: integer("uso_total").notNull().default(0),
  },
  (tabela) => [index("mcp_tokens_ativo_idx").on(tabela.ativo)],
);
