# ADR-002 — Multi-idioma: `courses` e `course_id` no banco

- **Data:** 2026-10-27
- **Status:** Aceito
- **Contexto:** o módulo emakhuwa (`docs/PLANEJAMENTO-EMAKHUWA.md`, seções 10 e 12.2) reaproveita o
  motor do Fluente365 para outro idioma. O banco da Fase 0 (`0001_initial_schema.sql`) assume um
  único idioma. A Fase F0.2 prepara o schema para vários cursos sem mudar domínio, ports nem telas.

## Decisão

### 1. Tabela `courses`

`public.courses (id text primary key, name text not null, ai_level, audio, visibility)`, onde:

- `ai_level`: `'full' | 'corpus_only'`
- `audio`: `'tts' | 'link_only'`
- `visibility`: `'shared' | 'owner_only'`

RLS ligada. Leitura por usuários autenticados quando `visibility = 'shared'` ou `public.is_admin()`.
Sem policy de escrita: só `service_role` e migrations alteram. O curso `'en'` (full, tts, shared) é
semeado na própria migration.

### 2. `course_id` nas tabelas existentes

`course_id text not null default 'en' references public.courses (id)` em: `student_models`,
`topic_mastery`, `srs_cards`, `error_log`, `study_sessions`, `gamification`, `content_units`,
`content_lessons`, `content_jw_refs` e `admin_costs`. (`profiles` fica de fora: é por usuário, não por
curso. Os nomes batem com a 0001.) Gamificação (XP, avatar, streak) passa a ser por curso; o custo de
IA em `admin_costs` passa a ser por idioma.

### 3. Chaves primárias resultantes

| Tabela           | PK anterior           | PK nova                                    |
| ---------------- | --------------------- | ------------------------------------------ |
| `student_models` | `user_id`             | `(user_id, course_id)`                     |
| `gamification`   | `user_id`             | `(user_id, course_id)`                     |
| `topic_mastery`  | `(user_id, topic_id)` | `(user_id, course_id, topic_id)`           |
| `error_log`      | `(user_id, code)`     | `(user_id, course_id, code)`               |
| `study_sessions` | `(user_id, day)`      | `(user_id, course_id, day)`                |
| `admin_costs`    | `day`                 | `(day, course_id)`                         |
| `srs_cards`      | `id`                  | `id` (inalterada)                          |
| `content_*`      | `id`                  | `id` (inalterada; `course_id` é só filtro) |

Índices: `srs_cards (user_id, course_id, due_at)` substitui `srs_cards_due_idx`;
`error_log_recent_idx` passa a `(user_id, course_id, last_at desc)`.

### 4. `public.tables_without_rls()`

Função `security definer` (com `search_path` vazio) que lista as tabelas do schema `public` sem RLS
ligada. Execução revogada de `public`, `anon` e `authenticated`; concedida só a `service_role`. O
teste de integração a usa para garantir que toda tabela nova nasce com RLS.

### 5. Por que `default 'en'`

O trigger `handle_new_user` e os repositórios atuais não informam `course_id`. Com o default, tudo
segue funcionando sem alterar os ports do domínio, o que está fora do escopo da F0.2.

**Dívida:** passar `courseId` pelos ports e casos de uso e remover o default. Fazer na F1.4 ou na E1,
o que vier primeiro.

### 6. Teste de isolamento

`src/infrastructure/supabase/rls.integration.test.ts` roda contra um projeto Supabase de teste, com
`SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY` e `SUPABASE_TEST_SERVICE_ROLE_KEY` em `.env.test.local`
(no `.gitignore`). É pulado quando as variáveis estão ausentes. Cobre: usuário A não lê nem grava
dados do B; `courses` `owner_only` invisível a não admin; `tables_without_rls()` vazia. Isso quita a
dívida de teste de RLS do ADR-001.

## Itens da seção 12.2 do planejamento emakhuwa

| #   | Item                                              | Situação                                                                                    |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | Tabela `courses` com flags de capacidade          | **Feito agora (F0.2)**                                                                      |
| 2   | Coluna `course_id` nas tabelas de aluno/conteúdo  | **Feito agora (F0.2)**, com default `'en'` (ver dívida acima)                               |
| 3   | Planner de sessão lê as flags do curso            | **Adiado para E4** (as flags já existem no banco; o `GenerateDailySession` não as lê ainda) |
| 4   | `SpeechPort` com verificação de capacidade        | **Adiado para E1**                                                                          |
| 5   | Feature flag `module_vmw` só para a conta do dono | **Adiado para E1** (a visibilidade `owner_only` em `courses` já é a base no banco)          |

As tabelas de corpus e léxico da seção 10 do planejamento emakhuwa (`corpus_documents`,
`lexicon_entries` etc.) **não** entram agora: a migration delas é da Fase E1.

## Consequências

- Adicionar um idioma passa a ser inserir uma linha em `courses` e conteúdo com o novo `course_id`.
- Dados atuais migram sem perda: tudo vira `course_id = 'en'`.
- Enquanto o default existir, um bug que esqueça o `courseId` grava silenciosamente em `'en'`. Por
  isso a dívida deve ser paga antes de ativar o primeiro curso não inglês para usuários.

## Policies de visibilidade de curso e dívidas

A migration `20261027130000` faz as policies de leitura de `content_*` e o `with check` das
tabelas do aluno exigirem que o curso seja visível (`exists` em `courses`, que já aplica
`shared` ou admin). Assim um curso `owner_only` não vaza nem recebe dados de não admin.

Dívidas registradas:

- Consistência `content_lessons.course_id` vs. unidade pai (FK composta, futura).
- Índices de `course_id` em `content_*` quando houver volume.
- Conferir no painel do projeto real a confirmação de e-mail e a política de senha (o
  `config.toml` só vale para o ambiente local).

## Verificação (F0.2)

Em 2026-10-27:

- Schema (migrations `0001`, `20261027120000` e `20261027130000`) aplicado no projeto Supabase
  real com `supabase db push`.
- Teste de integração de RLS com 47 casos passando contra o banco real.
- Login e logout por e-mail e por Google testados manualmente pelo André em `localhost:3000`, com
  sucesso.
- As dívidas da ADR-001 sobre teste de isolamento e tipos gerados ficam pagas.
