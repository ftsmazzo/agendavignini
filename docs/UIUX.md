# UI/UX Design — Agenda Vignini

> Direção visual e de experiência.
> Fonte: [x] Entrevista com usuário  [x] Leitura do código existente
> Depende de: [Fluxo do App](FLUXO-APP.md)

**Data**: 2026-10-13

## 1. Referências e tom

- Referências: o menu e a tela inicial atuais (contadores + calendário do ano + menu à esquerda). **Fonte: leitura de** `index.php` e `leftbar.php`.
- Tom: escritório de advocacia, denso, sério, fácil de ler o dia inteiro. Sem cara de página institucional.
- Pedido explícito: não revolucionar as telas; modernizar usabilidade; modo claro e escuro; visual atual. **Fonte: resposta do usuário.**

## 2. Plataformas-alvo

- [x] Web responsivo
- [ ] PWA
- [ ] Mobile nativo
- [ ] Desktop instalado

O uso principal é computador. O menu colapsa em tela estreita para consulta eventual no celular.

## 3. Sistema visual

- Paleta, modo claro: papel `#e4e9f0`, folha `#f7f8fb`, tinta `#1a2332`, linha `#c5ceda`, caneta `#1f4e79`. Cumprido em `#2f6b4f`. Audiência em `#8c4a3a`, para manter a leitura de “audiência é outra cor” que já existia no painel laranja.
- Modo escuro: fundo `#10151c`, folha `#1a212c`, tinta `#e7ebf2`, caneta `#8eb4e0`. A classe `dark` no `html` troca os tokens. A escolha fica em `localStorage`. Sem escolha, segue o sistema.
- Tipografia: Source Sans 3, corpo de 20px. Menu, campos e dias do calendário ficam em 18–20px; o ano e os contadores passam de 40px. A barra lateral é um bloco escuro, separada da área de trabalho.
- Componentes centrais: menu lateral com os mesmos rótulos, faixa dos três contadores, calendário anual clicável, listas e formulários. Sem conjunto de cartões com sombra.
- O dia de hoje no calendário é o único bloco preenchido com a cor caneta.

## 4. Acessibilidade

- Alvo: contraste de texto e foco visível no teclado (WCAG 2.2 AA como referência de trabalho, ainda sem auditoria formal).
- Rótulos de formulário ligados ao campo. Botão de tema diz a ação (“Usar modo escuro” / “Usar modo claro”).
- Público: equipe do escritório, inclusive quem lê texto pequeno por muitas horas. **Fonte: uso interno inferido do código; não houve entrevista de acessibilidade.**

## 5. Telas principais

| Tela | Jornada relacionada | Estado |
|---|---|---|
| Entrar | Começar o dia | Rascunho navegável, login ainda desligado |
| Tela inicial | Começar o dia | Rascunho com calendário real e contadores em zero |
| Prazos do dia | Começar o dia | Rascunho de rota |
| Agenda, novo, lista | Achar telefone | Rascunho de rota |
| Audiências | Audiência da semana | Rascunho de rota |
| Outros anos | Processo antigo | Rascunho de rota |
| Alterar dados | Conta | Rascunho de rota |
| Admin: prazos, audiências, usuários, relatórios | Cadastro e relatório | Rascunho de rota |
| Pesquisar | Processo antigo | Rascunho de rota |

---

## Gaps & Recomendações

- [x] Gap do legado: tema Bootstrap antigo, sem modo escuro, avisos de PHP na tela de prazo. **Fonte: leitura do código.**
- Recomendação: manter rótulos e ordem do menu; trocar densidade, contraste e tema.
- [x] Gap: o logotipo preto do site atual some no modo escuro. A base usa o nome “Coelho Vignini” em texto.
- Recomendação: se o escritório quiser a marca, produzir um desenho que use a cor do texto, não um PNG preto.
