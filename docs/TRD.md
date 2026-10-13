# TRD — Agenda Vignini

> Technical Requirements Document — traduz o PRD em decisões técnicas.
> Fonte: [x] Entrevista com usuário  [x] Leitura de código existente
> Depende de: [PRD](PRD.md)

**Data**: 2026-10-13

## 1. Stack tecnológica

| Camada | Tecnologia | Motivo/restrição |
|---|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind 4 | Um app só para tela e API. **Sugestão do plano aceita** (“use seu plano”). |
| Backend | Route handlers e Server Components do Next.js | Volume interno não pede serviço separado. |
| Banco de dados | PostgreSQL 16, Drizzle ORM | Usuário pediu Postgres. Drizzle é a escolha desta base para migração versionada. |
| Acesso | Sessão httpOnly, senha Argon2id | Substitui MD5 e sessão PHP. Argon2id entra na fase de login, ainda não no scaffold. |
| Infra/Deploy | Dockerfile `standalone`, Compose do Postgres local | Hospedagem a definir. |

## 2. Integrações externas

| Integração | Finalidade | Observações |
|---|---|---|
| SMTP do escritório | Resumo diário de prazos e audiências | Existe hoje em `cron-email.php`. Credencial nova, fora do repositório. **Fonte: leitura do código.** |
| Provedor de modelo | Sugerir campos da publicação e responder sobre a carteira | Fase posterior. Contrato sem treino com os dados. **Fonte: plano aceito.** |
| GlitchTip | Erro de aplicação | Quando houver DSN. |
| Uptime Kuma | `GET /health` a cada 60s | Quando houver URL pública. |

## 3. Requisitos não-funcionais

- Performance: busca na publicação histórica em até 2 segundos. Tela inicial sem esperar o texto integral dos prazos. **Sugestão do plano.**
- Escalabilidade: cerca de 17 pessoas e cerca de 71 mil prazos, 1,4 mil audiências, 250 contatos. **Fonte: leitura do dump de 13/10/2026.**
- Segurança: parâmetro no SQL, senha com Argon2id, papel admin/usuário, auditoria de cumprir/desfazer/editar/excluir. Sem `phpinfo`. Sem segredo no código.
- Compliance: contato e observação interna tratados como dado pessoal/profissional. Publicação de diário pode ser armazenada; não vai para treino de modelo.
- Disponibilidade: horário de escritório. SLA formal a definir.
- Internacionalização: português do Brasil. Sem segundo idioma.

## 4. Ambiente e deploy

- Onde roda: container. Local com Docker Compose. Produção ainda não apontada.
- Provedor: há mais de uma conta EasyPanel disponível. **A definir** qual usar. Não reutilizar banco de outro projeto.
- CI/CD: a definir no repositório GitHub privado, ainda não criado.

## 5. Restrições herdadas

- Sistemas legados a integrar: nenhum serviço externo além do e-mail. O PHP sai de uso depois da semana paralela. A origem dos dados é o MySQL `agenda_agendacv`. **Fonte: leitura do código e resposta do usuário.**
- Decisões já tomadas: Postgres no lugar de MySQL; não revolucionar as telas; modernizar usabilidade; modo claro e escuro. **Fonte: resposta do usuário.**
- Charset legado `latin1` e data `0000-00-00` não existem no modelo novo. **Fonte: leitura do dump.**

## 6. Manutenção

- Quem mantém: a definir. Premissa de trabalho: Fábrica IA mantém o código e o escritório opera o produto.
- Complexidade aceitável: um repositório, um app, um banco. Sem microsserviço.

---

## Gaps & Recomendações

- [x] Gap do legado: SQL concatenado, senha MD5, SMTP e banco em `include/configuracoes.php`, `info.php` com `phpinfo`. **Fonte: leitura do código.**
- Recomendação: nada disso é portado. Segredo só em variável de ambiente.
- [x] Gap desta base: login, carga e e-mail ainda não existem. O schema e as rotas sim.
- Recomendação: próxima etapa é autenticação e carga, não IA.
