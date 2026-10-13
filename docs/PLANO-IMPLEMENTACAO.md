# Plano de Implementação — Agenda Vignini

> Roteiro de execução.
> Depende de: todos os documentos anteriores.

**Data**: 2026-10-13

## 1. MVP

O que precisa existir para o escritório testar uma semana real:

- Login com os papéis atuais e troca de senha MD5 no primeiro acesso.
- Tela inicial com contadores verdadeiros e calendário.
- Prazos do dia, cumprir, desfazer e excluir conforme o papel.
- Cadastro de prazo com responsável obrigatório.
- Audiências, agenda, outros anos, alterar dados, usuários e relatório.
- Carga do dump, repetível no dia do corte.
- Resumo diário por e-mail.
- Modo claro/escuro e o menu já existentes nesta base.

## 2. Fases seguintes

| Fase | Escopo | Prioridade | Dependências |
|---|---|---|---|
| 0 Base | App, documentos, schema, casca das telas, `/health`, Docker | Feita nesta etapa | Nenhuma |
| 1 Acesso e carga | Argon2id, sessão, importação do MySQL para Postgres, auditoria | Alta | Dump atualizado e Postgres |
| 2 Paridade | Contadores, listas, formulários, cumprir, relatório, e-mail | Alta | Fase 1 |
| 3 Corte | Semana paralela com quem cadastra prazo; PHP deixa de receber lançamento novo | Alta | Fase 2 estável |
| 4 Inteligência | Colar publicação, sugerir campos e data, perguntar sobre a carteira com citação do prazo | Média | Fase 3 e contrato do modelo |

## 3. Marcos externos

- Data de lançamento/demo: a definir.
- Outras datas: o PHP continua recebendo prazo até a fase 3. A carga da fase 1 é ensaio; a carga do corte é outra.

## 4. Critério de "pronto" por fase

- Fase 0: `npm run lint`, `typecheck`, `knip` e `build` passam. `/health` responde ok. O menu percorre as telas do sistema atual. Modo claro e escuro persiste.
- Fase 1: um usuário importado entra, a senha passa a Argon2id, e a contagem de prazos do Postgres bate com o dump na mesma data.
- Fase 2: cadastrar prazo, ver no calendário, cumprir, achar por texto e receber o resumo do dia numa caixa de teste.
- Fase 3: cinco dias úteis de uso paralelo sem prazo lançado só no PHP.
- Fase 4: a sugestão da publicação não grava sozinha.

---

## Pendências para a próxima conversa

- Confirmar metas, prazo e quem mantém o código.
- Escolher a conta EasyPanel e criar o repositório GitHub privado.
- `git` neste computador está sem `user.name` e `user.email`. O commit inicial espera essa configuração. Não alterar o git config daqui.
