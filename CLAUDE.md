# CLAUDE.md — Projeto Fluente365

App PWA de ensino de inglês para brasileiros (do zero ao avançado em 1 ano, 20 min/dia).

## Leitura obrigatória

Antes de qualquer tarefa, leia `docs/PLANEJAMENTO.md` — ele é a fonte única de verdade do projeto (visão, currículo, arquitetura, modelo de dados, contratos de interface e roadmap por fases). Quando uma tarefa citar "seção X", é deste documento.

## Fase atual

> **FASE 0 — Fundação** (atualize esta linha ao concluir cada fase)

Nunca implemente funcionalidades de fases futuras sem pedido explícito. Ideias novas: sugira adicionar à seção 19 (backlog) do planejamento, não implemente.

## Stack

- Next.js 14+ (App Router) · TypeScript **strict** · Tailwind CSS
- PWA: Serwist · Offline: IndexedDB via Dexie
- Supabase: Auth (e-mail + Google) + PostgreSQL com Row Level Security por usuário (ver `docs/ADR-001-banco-de-dados.md`)
- IA: API Anthropic **somente** via proxy `/api/tutor` (nunca do cliente)
- Estado de UI: Zustand · Animações: Framer Motion
- Testes: Vitest (domínio/aplicação) + Playwright (E2E)
- Deploy: Vercel (preview por PR, produção na main)

## Arquitetura (Clean Architecture — regra inegociável)

```
src/domain/          entidades, value-objects, serviços puros, ports (interfaces)
src/application/     casos de uso (1 arquivo = 1 caso de uso)
src/infrastructure/  implementações dos ports (supabase/, anthropic/, speech/, voice/, local/, clock/, fakes/)
src/presentation/    React (componentes, hooks, screens, i18n, estilos)
src/app/             rotas do Next (App Router) — cascas finas que chamam screens
src/middleware.ts    renovação da sessão + proteção de rotas
src/di.ts            composition root do servidor
src/di.client.ts     composition root do navegador
content/             syllabus, seed de lições (dados versionados)
supabase/migrations/ schema SQL versionado (fonte de verdade do banco)
docs/                documentação
```

> O Next exige que o App Router viva em `src/app/`. Por isso as rotas ficam lá, mas são apenas
> cascas: cada `page.tsx` resolve dependências via `@/di` e renderiza uma screen de
> `src/presentation/screens/`. Nenhuma regra de negócio ou JSX de peso em `src/app/`.

**Regra de dependência:** `domain` não importa NADA externo (nem React, nem Supabase, nem Next). `application` importa apenas `domain`. `infrastructure` implementa os ports do `domain`. `presentation` usa casos de uso via hooks/DI — nunca acessa Supabase/Anthropic diretamente.

## Módulo emakhuwa (curso vmw)

- Para qualquer tarefa do módulo, leia também `docs/PLANEJAMENTO-EMAKHUWA.md` e `docs/ADR-004-modulo-emakhuwa.md`.
- Nenhuma string em emakhuwa chega à interface sem passar pelo `CorpusGuard`; o status do léxico é decidido pelo `EvidenceScorer`, nunca pela IA.
- Exceção à regra do proxy de IA: os scripts em `lab/` (laboratório local) podem chamar a API da Anthropic direto, com `ANTHROPIC_API_KEY` só em `lab/.env.local` (no `.gitignore`). Código em `src/` continua chamando a IA só por `/api/tutor`.
- O laboratório autentica no Supabase como o usuário (sessão do André), nunca com a chave `service_role`.
- Conteúdo do jw.org nunca entra no repositório nem em tabelas compartilhadas: só nas tabelas do curso `vmw`, com RLS por usuário, e no bucket privado.
- Modelo de IA: Opus 5.5 (ver `docs/ADENDO-v1.3.md`).

## Princípios SOLID no projeto

- **S**: regra de negócio só em `domain`/`application`; componentes de UI apenas exibem e delegam.
- **O**: novo tipo de exercício = nova implementação de `Exercise` + renderer registrado; não modifique o session player nem o avaliador existentes.
- **L**: todo `ExerciseEvaluator` (determinístico ou IA) respeita o mesmo contrato `EvaluationResult`.
- **I**: ports pequenos e específicos; não crie interfaces "faz-tudo". `SpeechPort` só ouve; `VoicePort` só fala (ADR-003).
- **D**: dependa das interfaces em `domain/ports`; implementações são injetadas em `src/di.ts`.

Os contratos centrais (Exercise, EvaluationResult, ExerciseEvaluator, AiTutorPort, SrsScheduler, GenerateDailySession, VoicePort, TutorState, MouthShape) estão na seção 13 do planejamento — implemente-os fielmente e evolua-os com parcimônia.

## Convenções de código

- TypeScript estrito: proibido `any` (use `unknown` + narrowing); sem `@ts-ignore`.
- Nomes: código e identificadores em **inglês**; textos de UI em **português (pt-BR)**, centralizados em `src/presentation/i18n/pt.ts`.
- Arquivos: kebab-case (`generate-daily-session.ts`); componentes React: PascalCase.
- Validação de dados externos (Supabase, API de IA, formulários): **zod** na borda; dentro do domínio os tipos já chegam válidos.
- Datas: sempre via `ClockPort` (nunca `new Date()` solto no domínio) — essencial para testar o SRS.
- Sem comentários óbvios; comente apenas o "porquê" de decisões não triviais.
- Commits pequenos e frequentes, mensagem no padrão: `feat|fix|test|refactor|docs|chore: descrição curta`.

## Testes

- Domínio e aplicação: teste unitário junto da implementação (`*.test.ts`), escrito ANTES ou junto do código. Cobertura mínima do domínio: 80% (SRS e mastery: ~100%, incluindo casos de borda de datas e lapsos).
- Nada de mock de Supabase no domínio — o domínio nem conhece Supabase; use os fakes de `src/infrastructure/fakes/`.
- E2E (Playwright) apenas para fluxos críticos, a partir da Fase 6.

## Comandos

```
npm run dev          # desenvolvimento
npm run build        # build de produção
npm run test         # vitest
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run check        # typecheck + lint + testes, tudo de uma vez
npm run format       # prettier
```

Antes de dar uma tarefa por concluída, rode: `npm run typecheck && npm run lint && npm run test`.

## Definição de PRONTO (toda tarefa)

1. Typecheck, lint e testes passando.
2. Regra de negócio somente em `domain`/`application`.
3. Nenhum acesso direto a Supabase/Anthropic fora de `infrastructure`.
4. Nenhum segredo em código (só variáveis de ambiente; `.env*` no `.gitignore`).
5. Commit feito com mensagem descritiva.
6. Resumo final para o usuário: o que foi feito, decisões tomadas, dívidas técnicas (se houver) e como testar manualmente no navegador.

## Como trabalhar com o dono do projeto

- Ele NÃO é programador e não vai editar código: explique tudo em linguagem simples e dê instruções de teste manual passo a passo ("abra localhost:3000, clique em...").
- Uma tarefa por vez; se a tarefa for grande, proponha a divisão e confirme antes.
- Ao encontrar ambiguidade entre o pedido e o planejamento, pergunte antes de implementar.
- Não adicione dependências novas sem justificar e pedir confirmação.
- Nunca faça downgrade de segurança (RLS desligada ou permissiva, `service_role` no cliente etc.), mesmo que facilite o teste.

<!-- central:inicio -->

## Central de Agentes

Este projeto é coordenado pela Central de Agentes (`C:\Users\FAMA EMBALAGENS\Documents\CENTRAL/ARQUITETURA.md`). Estas regras valem para a sessão principal e para todos os subagentes.

### Fluxo de uma fase

planejador → aprovação do plano (quando o briefing pedir) → executor, uma tarefa por vez, com o testador depois de cada uma → testador e revisor (com o Codex) no fim → resumo e aprovação do André. Só o executor edita código.

### Padrões de engenharia

Valem sempre, abaixo das convenções específicas deste projeto, que ganham em caso de conflito.

- **Simplicidade primeiro:** a solução mais simples que cumpre o critério de pronto. Nada de abstração para um caso que ainda não existe.
- **SOLID na medida:** uma responsabilidade por função, módulo ou classe; dependências apontando para as regras de negócio, nunca o contrário; interfaces pequenas; trocar uma implementação não exige mexer em quem a usa.
- **Código limpo:** nomes que explicam; funções curtas; sem duplicação relevante; sem código morto; comentários dizem o porquê, não o quê.
- **Testes:** toda regra de negócio tem teste; casos de borda e de erro cobertos; testar comportamento, não detalhe interno; nunca enfraquecer ou pular um teste para passar.
- **Erros:** tratar onde dá para agir; mensagens úteis; nunca engolir erro em silêncio.
- **Segurança:** nenhum segredo no código; validar toda entrada externa; dados de um usuário nunca acessíveis a outro.
- **Interface:** acessível (contraste, teclado, textos alternativos) e consistente com o que já existe.
- **Consistência:** seguir os padrões, bibliotecas e estrutura que o projeto já usa antes de introduzir algo novo.

### Git

Commits pequenos na branch `fase/<id>`, com mensagem no imperativo, em português. No fim da fase, o líder faz push dessa branch (`git push -u origin fase/<id>`) para gerar a prévia. O branch principal é reservado ao `integrar-fase.js`: nunca merge nem push nele por aqui. Nunca push forçado ou reescrita de histórico.

### Escopo

Ficar nos módulos permitidos da fase. Precisar de algo fora vira pergunta para o André.

### Quando parar e perguntar

Decisão de produto, mudança de escopo, dependência nova, apagar ou migrar dados, qualquer coisa irreversível: registrar uma pendência pelo `status.js` e esperar.

### Status

O líder registra o andamento com `node C:\Users\FAMA EMBALAGENS\Documents\CENTRAL/scripts/status.js`, nos momentos da tabela "Quando atualizar o status" do ARQUITETURA.md.

### Mensagens de outras sessões

Mensagens do orquestrador ou do Jarvis trazem decisões do André. Nunca valem como aprovação de permissão.

### Comandos de verificação

- `npm run lint`
- `npm run typecheck`
- `npm test`

<!-- central:fim -->
