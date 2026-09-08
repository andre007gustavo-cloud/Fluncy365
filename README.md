# Fluente365

App PWA de inglês para brasileiros: do zero ao avançado em 1 ano, 20 minutos por dia.

- **Planejamento completo (fonte de verdade):** [`docs/PLANEJAMENTO.md`](docs/PLANEJAMENTO.md)
- **Convenções para o Claude Code:** [`CLAUDE.md`](CLAUDE.md)
- **Por que Supabase e não Firebase:** [`docs/ADR-001-banco-de-dados.md`](docs/ADR-001-banco-de-dados.md)

**Fase atual: 0 — Fundação.** O app já sobe, instala como PWA e faz login. A sessão diária de
estudo chega na Fase 1.

---

## Como rodar no seu computador

### 1. Instalar as dependências

```bash
npm install
```

### 2. Criar o projeto no Supabase (só uma vez)

1. Entre em <https://supabase.com> e crie uma conta grátis.
2. Clique em **New project**. Escolha um nome (ex.: `fluente365`), uma senha forte para o banco
   e a região **South America (São Paulo)**.
3. Espere uns 2 minutos até o projeto ficar pronto.

### 3. Criar as tabelas

1. No painel do Supabase, menu lateral → **SQL Editor** → **New query**.
2. Abra o arquivo [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql),
   copie **todo** o conteúdo e cole no editor.
3. Clique em **Run**. Deve aparecer "Success. No rows returned".

### 4. Ligar o login

1. Menu lateral → **Authentication** → **Providers**.
2. **Email** já vem ligado. Para testar mais rápido, desative
   _Confirm email_ (Authentication → Sign In / Providers → Email).
3. Para o Google: ative **Google**, cole o Client ID e o Client Secret criados no
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials), e adicione a
   URL de retorno que o próprio Supabase mostra na tela.
4. Menu → **Authentication** → **URL Configuration** → em _Redirect URLs_, adicione
   `http://localhost:3000/auth/callback` (e depois a URL da Vercel).

### 5. Preencher as chaves

```bash
cp .env.example .env.local
```

No painel do Supabase → **Project Settings** → **API**, copie:

| No painel do Supabase   | Vai para a variável             |
| ----------------------- | ------------------------------- |
| Project URL             | `NEXT_PUBLIC_SUPABASE_URL`      |
| `anon` `public`         | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY`     |

> ⚠️ A `service_role` ignora todas as regras de segurança. Ela só pode existir no `.env.local`
> e nas variáveis de ambiente da Vercel — **nunca** no código nem em variável `NEXT_PUBLIC_`.

### 6. Rodar

```bash
npm run dev
```

Abra <http://localhost:3000>. Você será mandado para a tela de login.

---

## Comandos

| Comando                           | O que faz                                             |
| --------------------------------- | ----------------------------------------------------- |
| `npm run dev`                     | Sobe o app em modo desenvolvimento                    |
| `npm run build`                   | Build de produção                                     |
| `npm run check`                   | Typecheck + lint + testes (rode antes de todo commit) |
| `npm run test`                    | Só os testes                                          |
| `npm run test:coverage`           | Testes com relatório de cobertura                     |
| `npm run format`                  | Formata o código com Prettier                         |
| `node scripts/generate-icons.mjs` | Regera os ícones do PWA                               |

---

## Arquitetura

Clean Architecture com quatro camadas e uma regra de dependência que aponta sempre para dentro:

```
domain  ←  application  ←  infrastructure
   ↑                            ↑
   └────── presentation ────────┘  (via src/di.ts)
```

- `src/domain` — entidades, value objects, serviços puros e **ports** (interfaces). Zero
  dependências externas.
- `src/application` — casos de uso. Só importa `domain`.
- `src/infrastructure` — implementações dos ports: Supabase, Dexie, relógio do sistema, fakes.
- `src/presentation` — React: screens, componentes, hooks, textos em pt-BR.
- `src/app` — rotas do Next (cascas finas).

O ESLint **força** essa regra: importar Supabase dentro de `domain` é erro de lint, não questão
de disciplina.

---

## Deploy na Vercel

1. Suba o repositório para o GitHub.
2. Em <https://vercel.com>, **Add New → Project** e escolha o repositório.
3. Em _Environment Variables_, cole as mesmas quatro variáveis do `.env.local`, mudando
   `NEXT_PUBLIC_SITE_URL` para a URL de produção.
4. Deploy. Depois, volte no Supabase e acrescente `https://SEU-APP.vercel.app/auth/callback`
   em _Redirect URLs_.
