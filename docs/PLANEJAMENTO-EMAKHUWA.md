# FLUENTE365 · Módulo Emakhuwa — Professor de IA por Texto Paralelo

### Curso pessoal de emakhuwa (macua) dentro do Fluente365 · 20 minutos por dia

> **Versão do documento:** 0.1 · Outubro/2026 · **Status:** proposta
> **Local no repositório:** `docs/PLANEJAMENTO-EMAKHUWA.md`
> **Relação com o plano principal:** este documento **complementa** o [`PLANEJAMENTO.md`](./PLANEJAMENTO.md).
> Tudo que não estiver dito aqui segue o plano principal (arquitetura, SOLID, testes, CI, definição de pronto).
> **Dependência:** exige o Fluente365 multi-idioma (`course_id`) — ver seção 12 e o futuro `ADR-002`.

---

## Sumário

1. [Visão geral](#1-visão-geral)

2. [Princípios do módulo](#3-princípios-do-módulo)
3. [Fontes de conteúdo](#4-fontes-de-conteúdo)
4. [Arquitetura do fluxo](#5-arquitetura-do-fluxo)
5. [Sistema de evidência e confiança](#6-sistema-de-evidência-e-confiança)
6. [Serviços de IA](#7-serviços-de-ia)
7. [Exercícios e correção](#8-exercícios-e-correção)
8. [Progressão e sessão diária](#9-progressão-e-sessão-diária)
9. [Modelo de dados](#10-modelo-de-dados)
10. [Contratos de interface](#11-contratos-de-interface)
11. [Integração com o Fluente365](#12-integração-com-o-fluente365)
12. [Custos de IA](#13-custos-de-ia)
13. [Roadmap — Fase E0 à E5](#14-roadmap)
14. [Riscos e mitigações](#15-riscos-e-mitigações)
15. [Métricas de sucesso](#16-métricas-de-sucesso)
16. [Uso com o Claude Code](#17-uso-com-o-claude-code)
17. [Questões em aberto e backlog](#18-questões-em-aberto-e-backlog)

---

## 1. Visão geral

### 1.1 O problema

O emakhuwa é a principal língua bantu do norte de Moçambique, com milhões de falantes, mas quase nenhum material de estudo acessível: não há Google Tradutor, não há curso online, os dicionários são antigos e difíceis de achar, e a ortografia ainda não é totalmente padronizada. Os modelos de IA também conhecem pouco a língua — pedir que a IA "ensine emakhuwa" de memória produz erros que um iniciante não percebe.

### 1.2 A oportunidade

O jw.org publica um grande volume de material em emakhuwa (texto diário, artigos, Bíblia, vídeos, cânticos, dramas em áudio) com **tradução profissional e paralela ao português**: os mesmos parágrafos, nos dois idiomas. Isso é um corpus paralelo de alta qualidade — exatamente o que falta para aprender a língua.

### 1.3 A proposta

Um **professor de IA que estuda o texto paralelo junto com o aluno**:

1. O app coleta um texto em português e em emakhuwa.
2. A IA alinha frase por frase e analisa: propõe o que cada palavra significa e quais padrões gramaticais aparecem.
3. Cada dedução vira uma entrada num **léxico com evidência** que cresce a cada texto estudado.
4. Com isso, o app monta lições e exercícios **usando apenas frases reais** e agenda a revisão por repetição espaçada.

### 1.4 O que o módulo é — e o que não é

| É                                                       | Não é                                            |
| ------------------------------------------------------- | ------------------------------------------------ |
| Curso de **leitura e compreensão** (e escuta via links) | Curso de conversação                             |
| Professor que **deduz a partir de evidências**          | Professor que "sabe" emakhuwa de memória         |
| Ferramenta **pessoal**, de uma conta só                 | Produto para distribuir à família ou a terceiros |
| Progresso medido por **palavras e padrões confirmados** | Certificação CEFR                                |

### 1.5 Metas honestas (indicativas — calibrar após a Fase E0)

- **3 meses:** ~300 palavras/expressões confirmadas; ler o texto diário entendendo a ideia geral com apoio do português.
- **6 meses:** ~700 confirmadas; ler o texto diário entendendo a maior parte antes de revelar o português.
- **12 meses:** ~1.500 confirmadas; ler artigos simples com apoio pontual; acompanhar vídeos curtos com legenda.
- Fala e escrita **não** são metas deste módulo. Se um falante nativo entrar no projeto no futuro, ver seção 18.

---

---

## 3. Princípios do módulo

1. **A IA nunca inventa emakhuwa.** Toda string em emakhuwa exibida ao aluno existe, literalmente, num segmento coletado. Isso é garantido por código (`CorpusGuard`, seção 7.5), não por instrução no prompt.
2. **Toda dedução tem evidência.** Um significado só vale o quanto ele se repete em textos diferentes (seção 6). A IA propõe; o domínio conta e decide.
3. **Determinismo no domínio, IA na borda.** Como no plano principal: regras de confiança, seleção de frases, SRS e correção de exercícios são código puro e testado. A IA só alinha, analisa e redige explicações.
4. **Frequência dirige o currículo.** Os padrões e palavras que mais aparecem no corpus são ensinados primeiro.
5. **Input compreensível (i+1).** A seleção de frases para lições busca 85-95% de palavras já conhecidas.
6. **Honestidade sobre a incerteza.** O aluno sempre vê o nível de confiança de cada palavra e pode contestar qualquer dedução.

---

## 4. Fontes de conteúdo

| Fonte                                                                                                 | Uso no módulo                                            | Observação                                               |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| jw.org / Biblioteca On-line — PT e emakhuwa                                                           | Corpus paralelo: texto diário, artigos, folhetos, Bíblia | Coleta sob demanda (R4); ver tarefas de descoberta na E0 |
| jw.org — vídeos, cânticos, dramas em emakhuwa                                                         | Escuta e imitação (shadowing), **por link**              | Abertos no site/JW Library; registrados como imersão     |
| Colar texto manualmente                                                                               | Fallback do coletor                                      | Sempre disponível                                        |
| Dicionário emakhuwa-português (Frizzi, 1982), "Método macua" (Centis, 1985), notas gramaticais da SIL | Conferência humana pontual de deduções                   | Referência do dono; não entram no app                    |

**Fora de escopo:** TTS/STT do navegador (a Web Speech API não suporta emakhuwa). Não há áudio gerado nem reconhecimento de fala neste módulo.

---

## 5. Arquitetura do fluxo

### 5.1 Visão de ponta a ponta

```
[Usuário escolhe texto]
        │
        ▼
 1. COLETOR ──────────► documento PT + documento vmw (parágrafos numerados)
        │                (JwOrgFetcher | ManualPasteSource)
        ▼
 2. ALINHADOR (IA) ───► pares de frases PT↔vmw + confiança do alinhamento
        │                └─ validação determinística de cobertura
        ▼
 3. ANALISADOR (IA) ──► tokens, significados propostos, padrões observados
        │                └─ CorpusGuard: todo token existe no segmento
        ▼
 4. EVIDÊNCIA (domínio, sem IA) ──► léxico atualizado: hipótese → provável → confirmado
        │
        ├──► 5. SRS (só entradas "provável" ou "confirmado")
        │
        ├──► 6. GERADOR DE LIÇÕES (IA) ──► explicação PT + exercícios com frases reais
        │                                   └─ CorpusGuard em toda string vmw
        │
        └──► 7. TUTOR DE PERGUNTAS (IA + busca no corpus) ──► resposta com ocorrências citadas
```

### 5.2 Componentes

| Componente          | Camada          | Responsabilidade                                                                                            |
| ------------------- | --------------- | ----------------------------------------------------------------------------------------------------------- |
| `CorpusSourcePort`  | domain/ports    | Obter um documento PT+vmw por referência (data do texto diário, URL, nº do documento)                       |
| `JwOrgFetcher`      | infrastructure  | Implementação via rota de servidor, respeitando R4                                                          |
| `ManualPasteSource` | infrastructure  | Implementação por texto colado                                                                              |
| `TextNormalizer`    | domain/services | Normalização para comparação (minúsculas, apóstrofos unificados, pontuação removida)                        |
| `CorpusGuard`       | domain/services | Verifica que toda string vmw de qualquer saída de IA existe no corpus                                       |
| `EvidenceScorer`    | domain/services | Calcula o status de cada entrada do léxico a partir das evidências (seção 6)                                |
| `SegmentSelector`   | domain/services | Escolhe frases no nível i+1 para lições e exercícios                                                        |
| `AiCorpusTutorPort` | domain/ports    | Alinhar, analisar, gerar lição, responder pergunta                                                          |
| Casos de uso        | application     | `import-document`, `align-document`, `analyze-segments`, `build-lesson`, `answer-question`, `contest-entry` |

### 5.3 Estrutura de pastas (acréscimos ao plano principal)

```
src/
  domain/corpus/
    entities/          # CorpusDocument, Segment, LexiconEntry, Evidence, GrammarPattern
    services/          # TextNormalizer, CorpusGuard, EvidenceScorer, SegmentSelector
    ports/             # CorpusSourcePort, CorpusRepositoryPort, AiCorpusTutorPort
  application/corpus/
    import-document.ts
    align-document.ts
    analyze-segments.ts
    build-lesson.ts
    answer-question.ts
    contest-entry.ts
  infrastructure/corpus/
    jw-org-fetcher.ts
    manual-paste-source.ts
    supabase-corpus-repository.ts
prompts/vmw/
  aligner.v1.md
  analyzer.v1.md
  lesson-builder.v1.md
  tutor.v1.md
```

---

## 6. Sistema de evidência e confiança

É isto que substitui o falante nativo. A IA **propõe** significados; o `EvidenceScorer` (código puro, testado) **decide** o status.

### 6.1 Unidade do léxico

Como o emakhuwa é aglutinativo (uma palavra pode equivaler a uma frase em português), a entrada do léxico é a **forma de superfície** (a palavra como aparece no texto). Hipóteses de raiz e prefixos ficam em campos próprios e agrupam formas em "famílias".

### 6.2 Regras de status

| Status         | Regra                                                             | Pode virar cartão SRS? | Pode ser lacuna em exercício? |
| -------------- | ----------------------------------------------------------------- | ---------------------- | ----------------------------- |
| **hipótese**   | 1-2 ocorrências, ou evidência ainda inconsistente                 | Não                    | Não                           |
| **provável**   | ≥ 3 ocorrências com significado consistente                       | Sim                    | Não                           |
| **confirmado** | ≥ 5 ocorrências consistentes em ≥ 3 documentos diferentes         | Sim                    | Sim                           |
| **contestado** | Evidência conflitante, ou o usuário marcou "acho que está errado" | Sai do SRS             | Não                           |

- **Consistência:** o Analisador devolve, para cada ocorrência, o significado em contexto; o domínio compara com o significado principal da entrada (comparação normalizada + lista de sinônimos aceitos pela própria entrada).
- **Contestação:** volta a entrada para revisão; o Analisador reavalia quando surgirem novas ocorrências. Três contestações sem resolução → entrada congelada e destacada no painel.
- **Os limiares (3, 5, 3 documentos) são configuráveis** e devem ser calibrados na Fase E0.

### 6.3 Padrões gramaticais

Mesma lógica para padrões (ex.: "prefixo _mu-_ em verbos ↔ sujeito 'vocês'"): cada padrão guarda os segmentos que o exemplificam e ganha status pela quantidade e diversidade de exemplos. Padrões só entram em lições a partir de **provável**.

---

## 7. Serviços de IA

### 7.1 Visão geral

| Serviço           | Quando roda                                | Modelo sugerido                          | Saída validada por                            |
| ----------------- | ------------------------------------------ | ---------------------------------------- | --------------------------------------------- |
| **Aligner**       | Ao importar um documento                   | Sonnet (ou o mais forte disponível)      | Schema zod + verificação de cobertura         |
| **Analyzer**      | Após o alinhamento, em lotes de segmentos  | Sonnet (ou o mais forte disponível)      | Schema zod + `CorpusGuard` nos tokens         |
| **LessonBuilder** | Quando o planner pede a lição de um padrão | Sonnet; Haiku se a qualidade se mantiver | Schema zod + `CorpusGuard` em toda string vmw |
| **Tutor**         | Pergunta livre do usuário                  | Sonnet                                   | Schema zod + ocorrências citadas existem      |

Todos passam pelo proxy `/api/tutor` do plano principal (sessão verificada, rate limit, log de custo, system prompt no servidor), com novos tipos de tarefa. Temperatura baixa (0.2-0.4). Prompt caching ativo.

### 7.2 Aligner

- **Entrada:** parágrafos numerados em PT e em vmw do mesmo documento.
- **Saída:** lista de pares `{ paragraphNo, vmw, pt, confidence (0-1) }`.
- **Validações determinísticas:**
  - concatenar os `vmw` de cada parágrafo (normalizado) reproduz o parágrafo original — nenhuma frase inventada, perdida ou duplicada;
  - o mesmo vale para o `pt`;
  - pares com `confidence < 0.7` são guardados, mas **excluídos** de lições e exercícios.

### 7.3 Analyzer

- **Entrada:** lote de pares alinhados + trecho do léxico atual (entradas das palavras presentes no lote) + padrões já conhecidos.
- **Saída por segmento:** `tokens[]` com `{ form, segmentationGuess, glossInContext, lexiconEntryId | null }` e `patterns[]` observados com explicação curta.
- **Regra do prompt:** propor significados **só** com base no par PT↔vmw e nas ocorrências anteriores; indicar incerteza; nunca traduzir por memória quando o par não sustenta.
- **Validação:** todo `form` precisa existir no segmento vmw (via `CorpusGuard`); saída inválida → retry com o erro; falha 2× → segmento marcado "não analisado".

### 7.4 LessonBuilder

- **Entrada:** padrão-alvo (status ≥ provável), 6-12 segmentos selecionados pelo `SegmentSelector`, léxico conhecido do aluno.
- **Saída:** explicação em português (3-5 frases, contrastando com o português quando ajudar) + 4-6 exercícios que **referenciam segmentos por id**.
- **Validação:** toda string vmw da lição passa no `CorpusGuard`; gabaritos conferidos por código (seção 8).

### 7.5 CorpusGuard (a trava principal)

```
para cada string vmw em qualquer saída de IA:
  normalizada = TextNormalizer(string)
  se normalizada não for substring de algum segmento normalizado do corpus do usuário:
     rejeitar a saída inteira → retry com mensagem de erro
```

Isso torna **impossível** o app exibir emakhuwa inventado pela IA, independentemente do que o prompt diga.

### 7.6 Tutor de perguntas

- Pergunta livre ("o que significa _murima_?", "por que essa frase começa com _mu-_?").
- Busca no léxico e nos segmentos do corpus (busca textual normalizada; vetorial fica para o backlog) → envia à IA só o material encontrado.
- A resposta **cita os segmentos** que a sustentam e mostra o status de confiança. Sem evidência no corpus, a resposta diz isso — não improvisa.

---

## 8. Exercícios e correção

Todos os exercícios usam frases reais; **toda correção é determinística** (custo zero, sem risco de a IA errar o gabarito).

| Exercício                | Construção                                                                                                            | Requisito de status            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **Associar**             | Palavra vmw ↔ significado PT                                                                                          | Entradas ≥ provável            |
| **Lacuna**               | Remove uma palavra de um segmento; resposta = palavra original                                                        | Palavra removida confirmada    |
| **Ordenar**              | Embaralha as palavras de um segmento curto (≤ 8 palavras)                                                             | Segmento com alinhamento ≥ 0.7 |
| **Qual a tradução?**     | Segmento vmw → escolher o PT certo entre o original e 3 distratores (PT de outros segmentos)                          | Alinhamento ≥ 0.7              |
| **Compreensão**          | Pergunta em PT sobre o sentido do segmento (múltipla escolha gerada pela IA, gabarito conferido contra o PT alinhado) | Alinhamento ≥ 0.7              |
| **Ler antes de revelar** | Lê o segmento vmw, autoavalia quanto entendeu, revela o PT                                                            | —                              |

Comparação de respostas digitadas: `TextNormalizer` + tolerância a apóstrofos e vogais longas digitadas de forma diferente.

**Fora de escopo:** ditado (não há áudio segmentado), escrita livre e fala corrigidas.

---

## 9. Progressão e sessão diária

### 9.1 Progressão (sem CEFR)

- **Nível interno** = palavras confirmadas que o aluno domina no SRS + padrões dominados.
- **Ordem de ensino** = frequência no corpus: o planner escolhe o padrão mais frequente ainda não dominado.
- **Ordem das fontes** (sugerida): textos curtos (texto diário, folhetos) → cânticos (letras curtas e repetitivas, com áudio por link) → artigos curtos → artigos completos. A disponibilidade de cada tipo em emakhuwa é verificada na Fase E0.

### 9.2 Sessão de 20 minutos

| Minutos | Bloco                | Conteúdo                                                                                             | Correção       |
| ------- | -------------------- | ---------------------------------------------------------------------------------------------------- | -------------- |
| 0-4     | **SRS**              | Revisão dos cartões vencidos (só entradas ≥ provável)                                                | Determinística |
| 4-10    | **Lição do padrão**  | Explicação curta + 4-6 exercícios com frases reais                                                   | Determinística |
| 10-17   | **Leitura paralela** | Texto do dia: ler o vmw primeiro, tentar entender, revelar o PT, tocar numa frase para ver a análise | —              |
| 17-19   | **Coleta**           | Marcar palavras que quer aprender → viram cartão (se ≥ provável) ou ficam "em observação"            | —              |
| 19-20   | **Fechamento**       | Palavras novas confirmadas hoje, XP, streak                                                          | —              |

- **Domingo:** revisão estendida + relatório do léxico (quantas entradas subiram de status na semana, quantas foram contestadas).
- **Escuta (opcional, fora dos 20 min):** cânticos, dramas e vídeos em emakhuwa por link, registrados na Trilha de Imersão do plano principal.

---

## 10. Modelo de dados

Todas as tabelas: RLS ligada, policy `auth.uid() = user_id` em SELECT/INSERT/UPDATE/DELETE, e `course_id` para permitir outros idiomas no futuro com o mesmo motor. Esboço (a migration real será escrita na Fase E1):

```sql
-- Documento coletado (par PT + vmw)
create table public.corpus_documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  course_id     text not null,                 -- 'vmw'
  source_kind   text not null,                 -- 'daily_text' | 'article' | 'brochure' | 'bible' | 'manual'
  source_ref    text not null,                 -- nº do documento, data ou URL de origem
  title_pt      text,
  title_target  text,
  paragraphs_pt     jsonb not null,            -- [{ no, text }]
  paragraphs_target jsonb not null,
  media_url     text,                          -- link para áudio/vídeo oficial, se houver
  status        text not null default 'imported', -- imported | aligned | analyzed | failed
  fetched_at    timestamptz not null default now(),
  unique (user_id, course_id, source_ref)
);

-- Frase alinhada
create table public.corpus_segments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  document_id   uuid not null references public.corpus_documents(id) on delete cascade,
  paragraph_no  int  not null,
  position      int  not null,
  text_target   text not null,
  text_pt       text not null,
  text_target_norm text not null,              -- para o CorpusGuard e buscas
  align_confidence numeric not null,
  analyzed      boolean not null default false
);
create index on public.corpus_segments (user_id, text_target_norm);

-- Entrada do léxico
create table public.lexicon_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  course_id     text not null,
  form          text not null,                 -- forma de superfície
  form_norm     text not null,
  gloss_pt      text not null,                 -- significado principal
  gloss_aliases text[] not null default '{}',  -- sinônimos aceitos
  root_guess    text,                          -- hipótese de raiz (agrupa famílias)
  morph_notes   jsonb,
  status        text not null default 'hypothesis', -- hypothesis | probable | confirmed | contested
  occurrences   int  not null default 0,
  distinct_docs int  not null default 0,
  contest_count int  not null default 0,
  updated_at    timestamptz not null default now(),
  unique (user_id, course_id, form_norm)
);

-- Cada ocorrência que sustenta (ou contradiz) uma entrada
create table public.lexicon_evidence (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  entry_id      uuid not null references public.lexicon_entries(id) on delete cascade,
  segment_id    uuid not null references public.corpus_segments(id) on delete cascade,
  gloss_in_context text not null,
  consistent    boolean not null
);

-- Padrões gramaticais
create table public.grammar_patterns (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  course_id     text not null,
  name          text not null,
  explanation_pt text not null,
  example_segment_ids uuid[] not null default '{}',
  status        text not null default 'hypothesis',
  frequency     int  not null default 0
);

-- Lições geradas (cache)
create table public.corpus_lessons (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  pattern_id    uuid references public.grammar_patterns(id) on delete set null,
  explanation_pt text not null,
  exercises     jsonb not null,                -- referenciam segment ids
  prompt_version text not null,
  created_at    timestamptz not null default now()
);
```

Reaproveitadas do plano principal (com `course_id`): `srs_cards`, `study_sessions`, `gamification`, `admin_costs`.

---

## 11. Contratos de interface

```ts
// domain/corpus/ports/corpus-source.port.ts
export interface CorpusSourcePort {
  fetch(ref: SourceRef): Promise<RawParallelDocument>; // parágrafos PT + vmw
}

// domain/corpus/ports/ai-corpus-tutor.port.ts
export interface AiCorpusTutorPort {
  align(doc: RawParallelDocument): Promise<AlignedPair[]>;
  analyze(batch: AnalysisInput): Promise<SegmentAnalysis[]>;
  buildLesson(input: LessonInput): Promise<CorpusLessonDraft>;
  answer(question: string, context: RetrievedEvidence): Promise<TutorAnswer>;
}

// domain/corpus/services/corpus-guard.ts (puro, 100% testável)
export interface CorpusGuard {
  /** Retorna as strings que NÃO existem no corpus. Lista vazia = aprovado. */
  findUnknown(targetStrings: string[], corpus: NormalizedSegmentIndex): string[];
}

// domain/corpus/services/evidence-scorer.ts (puro)
export type LexiconStatus = "hypothesis" | "probable" | "confirmed" | "contested";
export interface EvidenceScorer {
  score(entry: LexiconEntry, evidence: Evidence[], thresholds: Thresholds): LexiconStatus;
}

// domain/corpus/services/segment-selector.ts (puro)
export interface SegmentSelector {
  /** Frases com 85-95% de palavras conhecidas pelo aluno, alinhamento ≥ minConfidence. */
  select(segments: Segment[], known: Set<string>, opts: SelectOptions): Segment[];
}
```

---

## 12. Integração com o Fluente365

### 12.1 Reaproveitado sem mudança

SRS (`SrsScheduler`), Session Player, avaliadores determinísticos, streak e escudos, XP e avatar, PWA/offline, Supabase, proxy `/api/tutor`, painel de custos, CI e testes.

### 12.2 Mudanças no projeto principal (base do futuro `ADR-002 — Multi-idioma`)

1. Tabela `courses` (`id`, nome, flags de capacidade: `ai_level: full | corpus_only`, `audio: tts | link_only`, `visibility: shared | owner_only`).
2. Coluna `course_id` nas tabelas de aluno e de conteúdo do plano principal.
3. O planner de sessão lê as flags do curso (ex.: curso `vmw` não agenda blocos de fala nem ditado).
4. `SpeechPort` ganha verificação de capacidade; curso sem TTS esconde botões de áudio.
5. Feature flag `module_vmw` liberada só para a conta do dono (R2).

**Custo de fazer agora:** baixo (o schema ainda está no início). **Custo de fazer depois:** migração de todas as tabelas com dados.

---

## 13. Custos de IA

Estimativa para **um usuário, um texto por dia** (~500 palavras por idioma), usando os preços de referência da seção 14.1 do plano principal (Sonnet ~US$3 / US$15 por milhão de tokens — **verificar sempre a página oficial**):

| Etapa                    | Tokens/dia (aprox.)     | Custo/dia (aprox.)            |
| ------------------------ | ----------------------- | ----------------------------- |
| Aligner                  | 3k entrada + 2k saída   | ~US$0,04                      |
| Analyzer                 | 6k entrada + 3k saída   | ~US$0,06                      |
| LessonBuilder            | 3k entrada + 1,5k saída | ~US$0,03                      |
| Tutor (poucas perguntas) | 2k entrada + 0,5k saída | ~US$0,01                      |
| **Total**                |                         | **~US$0,15/dia ≈ US$4-5/mês** |

Reduções: prompt caching nos system prompts; lições em cache (geradas uma vez por padrão); Batch API para importar documentos antigos de uma vez. Controles: os mesmos da seção 14.3 do plano principal (log por chamada, teto no console, kill-switch).

---

## 14. Roadmap

Dedicação parcial (~10-15h/semana) com o Claude Code. As fases E2+ dependem do proxy `/api/tutor` (Fase 2 do plano principal) — ele pode ser antecipado se o módulo vier antes.

### FASE E0 — Validação no chat (1-2 semanas) · _sem código_

**Objetivo:** provar que a IA alinha e analisa bem o suficiente antes de investir em código. É a fase de maior risco.

**Tarefas:**

1. **Descoberta das fontes:** confirmar o emakhuwa na Biblioteca On-line; mapear o padrão de URL do texto diário e dos artigos em PT e em vmw; verificar se o número do documento coincide entre os idiomas; listar quais publicações têm áudio/vídeo em emakhuwa.
2. Escrever `aligner.v1` e `analyzer.v1` (prompts + schemas JSON) aqui no chat.
3. Rodar com 10 textos diários colados manualmente; montar o léxico numa planilha simulando as regras da seção 6.
4. Conferir uma amostra de deduções contra o dicionário/método, se disponíveis.

**Critérios de aceite (metas iniciais, ajustáveis):** alinhamento correto em ≥ 95% das frases (conferido lendo o PT); ≥ 70% das glosas avaliadas como plausíveis; ≥ 30 entradas chegando a "provável" após 10 textos.
**Decisão:** seguir, ajustar prompts ou parar.

### FASE E1 — Base multi-idioma (2-4 dias, junto da Fase 0/1 do inglês)

**Tarefas:** `ADR-002`; tabela `courses`; `course_id`; migration das tabelas da seção 10 com RLS; feature flag `module_vmw`; teste de integração provando que **outra conta não lê nada do corpus**.
**Critérios de aceite:** RLS testada; flags lidas pelo planner; CI verde.

### FASE E2 — Coletor, alinhador e leitor paralelo (2-3 semanas)

**Tarefas:** `CorpusSourcePort` + `JwOrgFetcher` (limite diário, cache, R4) + `ManualPasteSource`; caso de uso `import-document`; Aligner com validação de cobertura; tela de **leitura paralela** (vmw/PT lado a lado, revelar PT por frase).
**Critérios de aceite:** importar 7 textos diários seguidos sem erro bloqueante; validação de cobertura rejeita alinhamentos que perdem ou inventam frases (testado); fallback de colar texto funciona.

### FASE E3 — Analisador, léxico com evidência e SRS (2-3 semanas)

**Tarefas:** `TextNormalizer`, `CorpusGuard` e `EvidenceScorer` com testes ≥ 90%; Analyzer em lotes; tela do léxico (status, ocorrências, botão contestar); cartões SRS a partir de entradas ≥ provável; toque numa frase mostra a análise.
**Critérios de aceite:** `CorpusGuard` bloqueia 100% das strings inventadas em testes; status muda corretamente conforme as evidências (testes de regra); contestação tira o cartão do SRS.

### FASE E4 — Lições e sessão diária (3 semanas)

**Tarefas:** `SegmentSelector` (i+1); LessonBuilder; exercícios da seção 8 com correção determinística; sessão de 20 min da seção 9.2 integrada ao Session Player; relatório de domingo do léxico.
**Critérios de aceite:** 7 sessões seguidas completas; nenhuma string vmw fora do corpus em 50 lições geradas (verificado pelo guard + amostragem manual); custo medido dentro da seção 13.

### FASE E5 — Tutor de perguntas e imersão (2 semanas)

**Tarefas:** Tutor com busca no corpus e citação de segmentos; links de áudio/vídeo por documento; registro de escuta na Trilha de Imersão; exportação pessoal do léxico (CSV para Anki).
**Critérios de aceite:** respostas sempre citam ocorrências reais ou dizem que não há evidência; exportação funciona.

### Linha do tempo

| Fase      | Duração            | Marco                                   |
| --------- | ------------------ | --------------------------------------- |
| E0        | 1-2 sem            | Go/no-go com dados reais                |
| E1        | 2-4 dias           | Fluente365 multi-idioma, módulo isolado |
| E2        | 2-3 sem            | Leitura paralela no app                 |
| E3        | 2-3 sem            | Léxico com evidência + SRS              |
| E4        | 3 sem              | Lições e sessão diária completa         |
| E5        | 2 sem              | Tutor de perguntas + imersão            |
| **Total** | **~10-13 semanas** | **Módulo completo**                     |

---

## 15. Riscos e mitigações

| #   | Risco                                         | Impacto     | Mitigação                                                                                         |
| --- | --------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| 1   | Uso fora do escopo pessoal (termos do jw.org) | Legal/ético | Regras R1-R6; RLS + feature flag; sem exportação do corpus; revisão obrigatória se o uso mudar    |
| 2   | IA analisa errado e o aluno aprende errado    | Produto     | Sistema de evidência; só "provável+" vira cartão; contestação; conferência pontual com dicionário |
| 3   | Tradução não literal confunde o alinhamento   | Produto     | Alinhamento por frase, não por palavra; pares com confiança < 0.7 fora dos exercícios             |
| 4   | IA "inventa" emakhuwa                         | Produto     | `CorpusGuard` determinístico em toda saída                                                        |
| 5   | Mistura de variantes makhuwa                  | Produto     | R5: só `vmw`; coletor recusa outras variantes                                                     |
| 6   | Coletor bloqueado ou estrutura do site muda   | Operacional | Coleta rara e sob demanda; fallback de colar texto sempre disponível                              |
| 7   | Grafia inconsistente (tom, vogais longas)     | Produto     | `TextNormalizer` + tolerância na correção                                                         |
| 8   | Expectativa de falar e não conseguir          | Motivação   | Metas honestas (1.5); módulo declarado como leitura e compreensão                                 |
| 9   | Custo subir                                   | Financeiro  | Cache de lições, prompt caching, teto e kill-switch do plano principal                            |

---

## 16. Métricas de sucesso

- **Léxico:** entradas confirmadas por mês (meta inicial: ≥ 100/mês após o 2º mês).
- **Compreensão:** % do texto diário entendido **antes** de revelar o português (autoavaliação + questões de compreensão), subindo mês a mês.
- **Retenção:** ≥ 80% de acerto em cartões maduros (intervalo ≥ 21 dias).
- **Qualidade da IA:** taxa de contestação < 5% das entradas confirmadas; 0 strings vmw fora do corpus.
- **Hábito:** sessão diária em ≥ 70% dos dias.

---

## 17. Uso com o Claude Code

1. Este arquivo fica em `docs/PLANEJAMENTO-EMAKHUWA.md`; o `CLAUDE.md` passa a citar: "para o módulo emakhuwa, leia também docs/PLANEJAMENTO-EMAKHUWA.md, em especial as regras da seção 2".
2. Uma tarefa por caso de uso, na ordem: domínio (com testes) → caso de uso → adapter → UI.
3. **Definição de pronto extra do módulo:** nenhuma string em emakhuwa chega à UI sem passar pelo `CorpusGuard`; toda tabela nova tem RLS por `user_id` e teste de isolamento.
4. Prompts versionados em `prompts/vmw/` e escritos/testados no chat antes de ir para o código (como no plano principal).

---

## 18. Questões em aberto e backlog

**Em aberto (resolver na E0):**

- Código e padrão de URL do emakhuwa na Biblioteca On-line; se o número do documento coincide entre PT e vmw.
- Quais tipos de publicação existem em emakhuwa e quais têm áudio.
- Limiares finais do sistema de evidência.
- Haiku serve para o LessonBuilder ou precisa ser Sonnet?

**Backlog (pós-módulo):**

- Busca vetorial no corpus para o Tutor.
- Modo "Bíblia paralela": navegar por livro/capítulo com análise.
- **Validação humana:** se um falante nativo entrar no projeto, novo status `verified` acima de `confirmed`, e liberação de exercícios de produção (tradução PT→vmw, escrita).
- Reaproveitar o motor para outra língua com corpus paralelo (o desenho por `course_id` já permite).

---

_Fim do documento. Próximo passo: Fase E0 — colar no chat o texto diário em português e em emakhuwa e testar o `aligner.v1` e o `analyzer.v1`._
