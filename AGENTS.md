<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agenda Vignini

Sistema interno do escritório Coelho Vignini: prazos, audiências e agenda telefônica. Substitui o PHP de `agendacv.com.br`. A rotina das telas permanece; a base técnica é outra.

A documentação de produto está em `docs/`. Este arquivo é a fonte única das regras de código. `.cursor/rules/projeto.mdc` só aponta para cá.

## Arquitetura

- Next.js (App Router) e TypeScript em `src/`.
- PostgreSQL via Drizzle. O esquema está em `src/db/schema.ts`. A conexão fica em `src/db/client.ts` e só deve ser criada quando `DATABASE_URL` existir.
- A casca visual é `src/components/casca.tsx`. O menu repete o sistema atual: tela inicial, agenda, audiências, outros anos, alterar dados e painel do administrador.
- Tema claro/escuro por classe `dark` no `html`, com a preferência em `localStorage` (`tema` = `claro` ou `escuro`). Sem escolha salva, segue o sistema operacional.
- `/health` responde `{ "status": "ok" }` e é o alvo de monitoramento.

## O que não fazer

- Não mudar a ordem mental das telas (hoje, semana, calendário, cumprir prazo, audiência, agenda). Melhorar leitura, contraste, foco e modo escuro.
- Não copiar senha, SMTP ou dump com dados de clientes para este repositório.
- Não gravar segredo em código. Variáveis ficam em ambiente; o exemplo é `.env.example`.
- Não marcar prazo como cumprido, protocolar ou enviar mensagem a cliente sem uma pessoa confirmar.
- Não reutilizar o banco de outro projeto.

## Segurança

- Senha nova com Argon2id. Hash MD5 legado só no primeiro login, e em seguida é substituído.
- Consultas só pelo Drizzle, com parâmetro. Sem concatenar SQL.
- Sessão httpOnly. Papéis `admin` e `usuario`, iguais aos do sistema atual.
- Toda ação de cumprir, desfazer, editar ou excluir grava `auditoria`.
- Dado de contato e observação interna não vai para modelo de IA sem contrato que impeça treino.
- `/health` não devolve detalhe de banco, versão interna nem variável de ambiente.

## Fluxo de mudança

1. Issue curta com o comportamento esperado.
2. Branch e pull request para `main`.
3. O PR descreve o que a pessoa do escritório passa a conseguir fazer.
4. Antes de pedir revisão: `npm run lint`, `npm run typecheck`, `npm run knip` e `npm run build`.

## Esteira

- Biome: formato e lint.
- TypeScript estrito: `npm run typecheck`.
- Knip: código e dependência sem uso. Export do schema Drizzle fica de fora de propósito, porque é a API do banco.
- Teste de mutação (Stryker) entra quando houver suíte de teste. Ainda não há.
- Erro em produção: GlitchTip, com DSN em `SENTRY_DSN`, quando o projeto existir lá.
- Disponibilidade: Uptime Kuma em `/health`, intervalo de 60s, quando o endereço público existir.

## Deploy

Dockerfile em modo `standalone`. Banco local: `docker compose up -d` e `DATABASE_URL` do `.env.example`. Provedor de hospedagem ainda não foi escolhido entre as contas EasyPanel disponíveis.
