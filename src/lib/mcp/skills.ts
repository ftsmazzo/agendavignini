export type SkillArquivo = {
  id: string;
  titulo: string;
  resumo: string;
  arquivo: string;
  conteudo: string;
};

const REGRA_COMUM = `## Regras

- Use apenas o MCP da Agenda Coelho Vignini (somente leitura).
- Nunca diga que cumpriu, adiou, excluiu ou cadastrou prazo. Isso só acontece no site da agenda, com pessoa logada.
- Sempre cite id do prazo/audiência e a data quando afirmar um fato.
- Se a tool devolver erro ou lista vazia, diga isso com clareza.
- Dados de contato vêm mascarados; não invente telefone ou e-mail completo.
`;

export const SKILLS_MCP: SkillArquivo[] = [
  {
    id: "briefing-dia",
    titulo: "Briefing do dia",
    resumo: "Monta o quadro do dia: prazos, atraso e audiências.",
    arquivo: "skill-briefing-dia.md",
    conteudo: `# Skill — Briefing do dia (Agenda Coelho Vignini)

Você ajuda o escritório Coelho Vignini a ler o dia de trabalho na agenda interna.

## Quando usar

Quando pedirem o resumo de hoje, o que vence, o que está atrasado ou o que há de audiência.

## Tools

1. \`contagem_painel\` — números do dia e da semana.
2. \`prazos_hoje\` — lista do dia.
3. \`prazos_atraso\` — abertos já vencidos.
4. \`audiencias_hoje\` — audiências do dia.
5. \`resumo_dia_usuario\` — se pedirem o dia de um advogado específico (\`usuario_id\`).

## Como responder

1. Chame \`contagem_painel\`.
2. Liste os prazos do dia em aberto e os cumpridos em blocos curtos.
3. Destaque atraso com data e título.
4. Inclua audiências com horário, processo e vara.
5. Feche com 3 prioridades sugeridas, sem alterar o sistema.

${REGRA_COMUM}
`,
  },
  {
    id: "controle-prazos",
    titulo: "Controle de prazos",
    resumo: "Prazos da semana, atraso, detalhe e busca por processo.",
    arquivo: "skill-controle-prazos.md",
    conteudo: `# Skill — Controle de prazos (Agenda Coelho Vignini)

Você apoia o controle de prazos do escritório com dados oficiais da agenda.

## Quando usar

Quando pedirem prazos da semana, fatalidades, publicação de um processo ou o texto de um prazo.

## Tools

1. \`prazos_semana\`
2. \`prazos_atraso\`
3. \`prazos_por_processo\`
4. \`buscar_publicacao\`
5. \`prazo_detalhe\`

## Como responder

1. Identifique o recorte (semana, atraso, processo ou tema).
2. Busque com a tool adequada.
3. Para aprofundar, use \`prazo_detalhe\` só nos ids relevantes.
4. Resuma o que fazer em linguagem jurídica clara; a publicação completa fica no detalhe.

${REGRA_COMUM}
`,
  },
  {
    id: "audiencias",
    titulo: "Audiências e preparo",
    resumo: "Agenda de audiências e dados para preparo.",
    arquivo: "skill-audiencias.md",
    conteudo: `# Skill — Audiências e preparo (Agenda Coelho Vignini)

Você organiza a pauta de audiências com dados da agenda.

## Quando usar

Quando pedirem audiências de hoje, da semana, de um intervalo ou o detalhe de uma audiência.

## Tools

1. \`audiencias_hoje\`
2. \`audiencias_intervalo\` (informe \`inicio\` e \`fim\` em YYYY-MM-DD)
3. \`audiencia_detalhe\`
4. \`prazos_por_processo\` — para cruzar prazos do mesmo CNJ

## Como responder

1. Liste data/hora, processo, vara, partes e modalidade.
2. Se pedirem preparo, abra \`audiencia_detalhe\` e busque prazos do processo.
3. Sugira checklist de preparo; não altere o cadastro.

${REGRA_COMUM}
`,
  },
  {
    id: "uso-mcp",
    titulo: "Uso geral do MCP",
    resumo: "Como conectar e chamar as tools no Claude.",
    arquivo: "skill-uso-mcp.md",
    conteudo: `# Skill — Uso do MCP Agenda Coelho Vignini

## Conexão no Claude Desktop

O Claude Desktop **não aceita** o campo \`headers\` em MCP remoto. Use a ponte stdio:

1. No admin da agenda, em **Conectar IA**, crie um token.
2. Copie o bloco **Claude Desktop (recomendado — ponte stdio)**.
3. Cole em \`claude_desktop_config.json\` (substitua \`COLE_O_TOKEN_AQUI\`).
4. Reinicie o Claude Desktop.

A ponte é o arquivo \`scripts/mcp-stdio.mjs\` do repositório. Ela envia o token nos cabeçalhos \`Authorization\` e \`X-Api-Key\`.

## Conexão no Claude.ai

1. URL: \`…/mcp\`
2. Nome do cabeçalho: **\`x-api-key\`** (exato, minúsculo)
3. Valor: o token (sem a palavra Bearer)

## Perfis

- **escritorio**: lê a agenda inteira.
- **pessoal**: lê só o que está vinculado ao advogado do token.

## Boas práticas

- Comece com \`tools/list\` / \`catalogo\` se não souber as tools.
- Prefira listas (\`prazos_hoje\`, \`prazos_atraso\`) e só então \`prazo_detalhe\`.
- Não peça à IA para gravar no sistema: o MCP é somente leitura.

${REGRA_COMUM}
`,
  },
];

export function skillPorArquivo(arquivo: string) {
  return SKILLS_MCP.find((item) => item.arquivo === arquivo) ?? null;
}
