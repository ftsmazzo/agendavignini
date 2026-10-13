# PRD — Agenda Vignini

> Product Requirements Document — o quê e por quê, não como.
> Fonte: [x] Entrevista com usuário  [x] Leitura de código existente

**Data**: 2026-10-13
**Responsável**: a definir (escritório Coelho Vignini, implementação Fábrica IA)

## 1. Resumo em uma frase

Agenda interna em que a equipe do Coelho Vignini vê o prazo do dia, marca como cumprido, consulta audiência e telefone, no mesmo ritmo do sistema atual.

## 2. Problema e contexto

- Problema real que motiva o projeto: o sistema vigente é PHP antigo, lento de evoluir, frágil em segurança e difícil de usar com conforto. **Fonte: leitura do código e resposta do usuário.**
- Como é resolvido hoje: aplicação em `agendacv.com.br`, com calendário anual, prazos, audiências, agenda telefônica, usuários e um e-mail diário. **Fonte: leitura do código** (`index.php`, `leftbar.php`, `cron-email.php`).
- Por que agora: o escritório segue no sistema atual, que resiste a mudança de rotina, e a base precisa ir para PostgreSQL com interface mais clara, segura e rápida. **Fonte: resposta do usuário.**

## 3. Público-alvo

- Persona principal: quem cadastra e acompanha prazo no escritório, no computador, várias vezes ao dia. **Fonte: leitura do código** (cerca de 17 usuários, papéis `admin` e `usuario`).
- Outros perfis: administrador (cadastro, exclusão, relatório) e usuário (consulta, cumprir prazo, alterar os próprios dados). **Fonte: leitura do código** (`seguranca.php`, menu admin).

## 4. Objetivos e métricas de sucesso

| Objetivo | Métrica | Meta |
|---|---|---|
| A rotina diária cabe no sistema novo | Uma pessoa que cadastra prazo completa uma semana real sem voltar ao PHP | Semana paralela sem lançamento perdido |
| Prazo chega na pessoa certa | Prazos novos com responsável | 100% dos prazos criados no sistema novo |
| Achar um processo antigo | Busca no texto da publicação | Resposta em até 2 segundos na base histórica |
| Segurança mínima | Senha fora de MD5 depois do primeiro acesso | 100% das contas que entrarem |

Metas numéricas acima são **sugestão do plano**, ainda sem meta formal do escritório.

## 5. Escopo

### Dentro do escopo (MVP)

- Tela inicial com prazos de hoje, prazos da semana, audiências da semana e calendário do ano.
- Abrir o dia e ver os prazos. Cumprir. Administrador desfaz ou exclui.
- Agenda telefônica: ver, adicionar, listar.
- Audiências: ver e, no admin, cadastrar e listar.
- Outros anos.
- Alterar os próprios dados.
- Usuários e relatório por advogado e período.
- Resumo do dia por e-mail, por pessoa, quando houver responsável.
- Carga do histórico (prazos desde 2009, audiências, contatos, usuários).

**Fonte: leitura do código** (menu e páginas da raiz) **e resposta do usuário** (aproveitar o banco, mudar para Postgres).

### Fora do escopo (por enquanto)

- Protocolar peça, cumprir prazo sozinho ou escrever para cliente. **Fonte: plano aceito pelo usuário.**
- Aplicativo nativo.
- Trocar os nomes das áreas (cível, trabalhista, administrativo).
- Revolucionar o desenho das telas. **Fonte: resposta do usuário.**

## 6. Funcionalidades principais

| Funcionalidade | Prioridade (MVP/depois) | Descrição curta |
|---|---|---|
| Calendário e contadores | MVP | Mesma leitura do dia que o `index.php` |
| Prazos e cumprir | MVP | Lista do dia, situação e quem cumpriu |
| Audiências | MVP | Lista e cadastro admin |
| Agenda telefônica | MVP | Contatos do escritório |
| Usuários, papéis, relatório | MVP | Admin e usuário, relatório por período |
| Resumo do dia | MVP | E-mail com o que é da pessoa na data |
| Colar publicação e sugerir campos | depois | IA sugere; uma pessoa confirma |
| Pergunta sobre a carteira | depois | Resposta cita o prazo já gravado |
| Modo claro e escuro | MVP | Pedido explícito de interface |

## 7. Restrições de negócio

- Prazo: a definir.
- Orçamento: a definir.
- Legais/regulatórias: publicações de diário são texto público; contato, observação interna e estratégia são dados do escritório e entram na LGPD. **Fonte: plano aceito.** O escritório é resistente a mudar o jeito de trabalhar. **Fonte: resposta do usuário.**

## 8. Riscos e premissas

- Premissa: a equipe aceita o sistema novo se a rotina visual for a mesma. Se for falsa, a troca paralela não fecha.
- Premissa: o dump de 13/10/2026 representa a base a migrar. Se o PHP continuar recebendo lançamento até o corte, a carga final precisa ser repetida.
- Risco: `prazosUsuarios` legado tem 2 vínculos. O e-mail diário histórico não prova quem era responsável. Prazos antigos podem ficar sem dono. **Fonte: leitura do código e do dump.**
- Risco: senhas estão em MD5. Quem não fizer o primeiro login precisa de convite.

---

## Gaps & Recomendações

- [x] Gap: não há métrica acompanhada no sistema atual. **Fonte: leitura do código.**
- Recomendação: validar as metas da seção 4 com o escritório antes do corte.
- [x] Gap: o formulário de prazo novo quebra quando `advogados` não vem no POST (`adm-form-prazos.php`). **Fonte: leitura do código e `error_log`.**
- Recomendação: no sistema novo o responsável é obrigatório só no prazo novo; o histórico entra sem inventar dono.
