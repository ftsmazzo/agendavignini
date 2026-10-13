# Esquema Backend — Agenda Vignini

> Modelagem de dados e API.
> Fonte: [x] Entrevista com usuário  [x] Leitura de código existente
> Depende de: [TRD](TRD.md)

**Data**: 2026-10-13

O esquema implementado está em `src/db/schema.ts`. Os nomes abaixo são os do Postgres novo. A origem é o MySQL `agenda_agendacv`.

## 1. Entidades principais

| Entidade | Campos-chave | Relacionamentos |
|---|---|---|
| usuarios | id, login, senha_hash, algoritmo_senha, papel, ativo, entra_no_relatorio | Origem: `usuarios` |
| contatos | nome, telefone, celular, email, endereco, nascimento | Origem: `agenda`. Nascimento nulo quando a data legada era inválida |
| prazos | area, data, titulo, conteudo, observacao, situacao, cumprido_por_id, cumprido_em | Origem: `prazos`. `status` deixa de misturar 0 e id de usuário |
| prazos_usuarios | prazo_id, usuario_id | Responsáveis. Origem: `prazosUsuarios` |
| audiencias | numero_processo, vara, local, reclamante, reclamado, preposto, data_hora, observacao | Origem: `audiencias` |
| audiencias_usuarios | audiencia_id, usuario_id | Origem: `audienciasUsuarios` |
| auditoria | ator_id, acao, entidade, entidade_id, em, detalhe | Nova. Não existe no legado |

Ids numéricos usam identity `BY DEFAULT`, para a carga informar o id antigo.

Índices iniciais: `prazos.data`, `audiencias.data_hora`, usuário do vínculo de prazo, entidade da auditoria.

Busca textual em português (`to_tsvector`) fica na migração da fase de paridade, sobre `titulo` e `conteudo`.

## 2. Autenticação e autorização

- Método: login e senha próprios. Sem rede social. **Fonte: leitura de** `login.php`.
- Hash novo: Argon2id. Hash legado MD5 só é aceito uma vez e substituído. A coluna `algoritmo_senha` guarda qual dos dois está gravado.
- Papéis: `admin` e `usuario`.
- Sessão ainda não implementada nesta base. A navegação está aberta de propósito.

## 3. Endpoints/ações principais

| Endpoint/Ação | Método | Autenticado? | Regra de negócio relevante |
|---|---|---|---|
| `/health` | GET | Não | Só `{ "status": "ok" }` |
| `/entrar` | tela | Não | Próxima fase: POST valida login |
| Tela inicial, calendário, listas | GET | Sim, na paridade | Usuário vê o escritório inteiro, como hoje |
| Cumprir prazo | POST | Sim | Grava situacao, cumprido_por_id, cumprido_em e auditoria |
| Desfazer ou excluir prazo | POST | Admin | Igual a `acoes-prazos.php` |
| Criar prazo | POST | Admin | Ao menos um responsável |
| Relatório | GET | Admin | Só usuários com `entra_no_relatorio` |
| Resumo do dia | job | Sistema | Um e-mail por usuário ativo com e-mail, na data |

Estas ações, fora `/health` e as telas, estão especificadas e ainda não codificadas.

## 4. Processamento assíncrono

- Um job diário substitui `cron-email.php`: para cada usuário ativo com e-mail, audiências do dia em que ele está vinculado e prazos do dia em que ele é responsável.
- Sem fila nesta fase. O volume cabe num agendamento único.

## 5. Armazenamento

- Tipo: texto estruturado. Publicação pode ser longa. Sem arquivo de mídia no fluxo atual. **Fonte: leitura do schema legado.**
- Volume: cerca de 71 mil prazos, texto grande em `conteudo`. Postgres 16 atende.
- Sensível: senha (hash), e-mail, celular, endereço, observação interna, texto de processo.

---

## Gaps & Recomendações

- [x] Gap legado: sem chave estrangeira; `status` sobrecarregado; data zero; charset latin1. **Fonte: leitura do dump.**
- Recomendação: a carga converte charset, zera data inválida para nulo e separa situação de autor do cumprimento.
- [x] Gap desta base: `postgres` já está na dependência via `src/db/client.ts`, e nenhuma rota abre conexão ainda.
- Recomendação: a primeira rota autenticada passa por `criarDb` e não instancia cliente na importação do módulo.
