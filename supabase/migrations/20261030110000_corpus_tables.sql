-- ============================================================================
-- Fluente365 - tabelas do corpus do curso vmw (Fase E1, ver
-- docs/PLANEJAMENTO-EMAKHUWA.md secao 12.5 e docs/ADR-005-acervo-autorizado.md)
-- Padrao de conteudo (content_*): leitura por quem enxerga o curso, escrita so
-- pela service_role. course_id sem default: o curso e sempre informado.
-- Contestacoes e respostas do falante ficam na migration seguinte.
-- Relacoes entre tabelas usam FK composta (course_id, id): uma linha nunca aponta
-- para outro curso. Por isso as tabelas referenciadas tem unique (course_id, id).
-- ============================================================================

begin;

-- Pares de publicacao (PT x emakhuwa)
create table public.corpus_documents (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id),
  kind text not null check (kind in ('daily_text', 'article', 'brochure', 'bible', 'video', 'manual')),
  source_ref text not null,
  title_pt text not null,
  title_vmw text not null,
  paragraphs_pt jsonb not null default '[]'::jsonb,
  paragraphs_vmw jsonb not null default '[]'::jsonb,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'paired', 'aligned', 'analyzed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, id),
  unique (course_id, kind, source_ref)
);

-- Frases alinhadas
create table public.corpus_segments (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id),
  document_id uuid not null,
  paragraph_no integer not null check (paragraph_no >= 0),
  position integer not null check (position >= 0),
  text_vmw text not null,
  text_pt text not null,
  text_normalized text not null,
  alignment_score real not null check (alignment_score between 0 and 1),
  alignment_note text,
  created_at timestamptz not null default now(),
  unique (course_id, id),
  unique (course_id, document_id, paragraph_no, position),
  foreign key (course_id, document_id)
    references public.corpus_documents (course_id, id) on delete cascade
);

-- Audio e video no Storage privado
create table public.corpus_media (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id),
  document_id uuid not null,
  lang text not null check (lang in ('pt', 'vmw')),
  kind text not null check (kind in ('audio', 'video')),
  storage_path text not null,
  duration_seconds real check (duration_seconds is null or duration_seconds > 0),
  subtitle_path text,
  created_at timestamptz not null default now(),
  unique (course_id, id),
  unique (course_id, storage_path),
  foreign key (course_id, document_id)
    references public.corpus_documents (course_id, id) on delete cascade
);

-- Trechos de midia ligados a um segmento
create table public.media_clips (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id),
  media_id uuid not null,
  segment_id uuid not null,
  scope text not null check (scope in ('paragraph', 'sentence')),
  start_ms integer not null check (start_ms >= 0),
  end_ms integer not null,
  created_at timestamptz not null default now(),
  check (end_ms > start_ms),
  foreign key (course_id, media_id)
    references public.corpus_media (course_id, id) on delete cascade,
  foreign key (course_id, segment_id)
    references public.corpus_segments (course_id, id) on delete cascade
);

-- Dicionario vivo; o status e decidido pelo EvidenceScorer (codigo), nunca pela IA.
-- contest_count e so o contador: as contestacoes em si ficam na migration seguinte.
create table public.lexicon_entries (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id),
  form text not null,
  form_normalized text not null,
  root_guess text,
  senses text[] not null default '{}',
  status text not null default 'hypothesis'
    check (status in ('official', 'verified', 'confirmed', 'probable', 'hypothesis', 'contested')),
  occurrences integer not null default 0 check (occurrences >= 0),
  distinct_docs integer not null default 0 check (distinct_docs >= 0),
  contest_count integer not null default 0 check (contest_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, id),
  unique (course_id, form_normalized)
);

-- Cada ocorrencia que sustenta (supports) ou contradiz uma entrada
create table public.lexicon_evidence (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id),
  entry_id uuid not null,
  segment_id uuid not null,
  sense text not null,
  supports boolean not null,
  created_at timestamptz not null default now(),
  unique (course_id, entry_id, segment_id, sense),
  foreign key (course_id, entry_id)
    references public.lexicon_entries (course_id, id) on delete cascade,
  foreign key (course_id, segment_id)
    references public.corpus_segments (course_id, id) on delete cascade
);

create table public.grammar_patterns (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id),
  pattern text not null,
  explanation_pt text not null,
  example_segment_ids uuid[] not null default '{}',
  status text not null default 'hypothesis'
    check (status in ('official', 'verified', 'confirmed', 'probable', 'hypothesis', 'contested')),
  frequency integer not null default 0 check (frequency >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, pattern)
);

-- Duvidas para o falante; a resposta dele fica na migration seguinte.
create table public.informant_questions (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id),
  question text not null,
  origin text not null,
  priority smallint not null default 3 check (priority between 1 and 5),
  created_at timestamptz not null default now(),
  unique (course_id, id)
);

create table public.phrasebook_entries (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id),
  phrase_vmw text not null,
  phrase_pt text not null,
  situation text not null,
  recording_media_id uuid,
  status text not null default 'hypothesis'
    check (status in ('official', 'verified', 'confirmed', 'probable', 'hypothesis', 'contested')),
  created_at timestamptz not null default now(),
  unique (course_id, phrase_vmw),
  -- FK composta com coluna nula nao e checada (gravacao opcional); set null so na coluna da midia.
  foreign key (course_id, recording_media_id)
    references public.corpus_media (course_id, id) on delete set null (recording_media_id)
);

-- Resultado da prova fixa por lote
create table public.agent_eval_runs (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id),
  batch_ref text not null,
  model text not null,
  prompt_version text not null,
  total_cases integer not null check (total_cases >= 0),
  passed_cases integer not null check (passed_cases >= 0),
  results jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (passed_cases <= total_cases)
);

-- Licoes geradas (cache), com a versao do prompt
create table public.corpus_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id),
  lesson_key text not null,
  version integer not null default 1 check (version >= 1),
  prompt_version text not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  unique (course_id, lesson_key, version)
);

-- ---------------------------------------------------------------------------
-- Indices das chaves estrangeiras. Onde uma chave unica ja comeca por
-- (course_id, <coluna da FK>) nao se repete o indice.
-- ---------------------------------------------------------------------------
create index corpus_documents_course_id_idx on public.corpus_documents (course_id);
create index corpus_media_document_id_idx on public.corpus_media (course_id, document_id);
create index media_clips_media_id_idx on public.media_clips (course_id, media_id);
create index media_clips_segment_id_idx on public.media_clips (course_id, segment_id);
create index lexicon_entries_course_id_idx on public.lexicon_entries (course_id);
create index lexicon_evidence_segment_id_idx on public.lexicon_evidence (course_id, segment_id);
create index grammar_patterns_course_id_idx on public.grammar_patterns (course_id);
create index informant_questions_course_id_idx on public.informant_questions (course_id);
create index phrasebook_entries_recording_media_id_idx
  on public.phrasebook_entries (course_id, recording_media_id);
create index agent_eval_runs_course_id_idx on public.agent_eval_runs (course_id);
create index corpus_lessons_course_id_idx on public.corpus_lessons (course_id);

-- ---------------------------------------------------------------------------
-- RLS: leitura so de cursos visiveis (o subselect passa pela RLS de courses);
-- sem policy de escrita, so a service_role grava.
-- ---------------------------------------------------------------------------
alter table public.corpus_documents enable row level security;
alter table public.corpus_segments enable row level security;
alter table public.corpus_media enable row level security;
alter table public.media_clips enable row level security;
alter table public.lexicon_entries enable row level security;
alter table public.lexicon_evidence enable row level security;
alter table public.grammar_patterns enable row level security;
alter table public.informant_questions enable row level security;
alter table public.phrasebook_entries enable row level security;
alter table public.agent_eval_runs enable row level security;
alter table public.corpus_lessons enable row level security;

create policy "corpus_documents_read" on public.corpus_documents
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id));
create policy "corpus_segments_read" on public.corpus_segments
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id));
create policy "corpus_media_read" on public.corpus_media
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id));
create policy "media_clips_read" on public.media_clips
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id));
create policy "lexicon_entries_read" on public.lexicon_entries
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id));
create policy "lexicon_evidence_read" on public.lexicon_evidence
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id));
create policy "grammar_patterns_read" on public.grammar_patterns
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id));
create policy "informant_questions_read" on public.informant_questions
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id));
create policy "phrasebook_entries_read" on public.phrasebook_entries
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id));
create policy "agent_eval_runs_read" on public.agent_eval_runs
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id));
create policy "corpus_lessons_read" on public.corpus_lessons
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id));

-- Defesa em profundidade: mesmo sem policy de escrita, tira o privilegio.
revoke insert, update, delete, truncate on
  public.corpus_documents, public.corpus_segments, public.corpus_media,
  public.media_clips, public.lexicon_entries, public.lexicon_evidence,
  public.grammar_patterns, public.informant_questions, public.phrasebook_entries,
  public.agent_eval_runs, public.corpus_lessons
  from anon, authenticated;

commit;
