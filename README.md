# Agenda Vignini

Agenda interna do escritório Coelho Vignini. Prazos, audiências e contatos, com a mesma organização de telas do sistema em PHP e uma base nova em Next.js e PostgreSQL.

## Documentos

- [PRD](docs/PRD.md)
- [TRD](docs/TRD.md)
- [Fluxo do app](docs/FLUXO-APP.md)
- [UI/UX](docs/UIUX.md)
- [Esquema backend](docs/ESQUEMA-BACKEND.md)
- [Plano de implementação](docs/PLANO-IMPLEMENTACAO.md)

Regras de código: [AGENTS.md](AGENTS.md).

## Rodar localmente

```bash
npm install
docker compose up -d
copy .env.example .env
npm run dev
```

A aplicação sobe em `http://localhost:3000`. Saúde: `http://localhost:3000/health`.

O login ainda não autentica. As telas estão abertas para revisar navegação, modo claro/escuro e calendário. Os números de prazo ficam em zero até a carga do banco.

## Verificação

```bash
npm run lint
npm run typecheck
npm run knip
npm run build
```
