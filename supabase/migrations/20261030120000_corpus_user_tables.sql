-- ============================================================================
-- Fluente365 - contestacoes e respostas do falante (Fase E1, ver
-- docs/PLANEJAMENTO-EMAKHUWA.md secao 12.5). Ao contrario das tabelas do corpus,
-- estas guardam dados de cada usuario: RLS por dono, no molde da
-- 20261027130000 (a escrita exige curso visivel).
-- ============================================================================

begin;

create table public.lexicon_contests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id text not null references public.courses (id),
  entry_id uuid not null references public.lexicon_entries (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.informant_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id text not null references public.courses (id),
  question_id uuid not null references public.informant_questions (id) on delete cascade,
  answer text not null check (char_length(answer) between 1 and 5000),
  answered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

-- Indices das FKs (a unique de informant_answers ja cobre user_id)
create index lexicon_contests_user_id_idx on public.lexicon_contests (user_id);
create index lexicon_contests_course_id_idx on public.lexicon_contests (course_id);
create index lexicon_contests_entry_id_idx on public.lexicon_contests (entry_id);
create index informant_answers_course_id_idx on public.informant_answers (course_id);
create index informant_answers_question_id_idx on public.informant_answers (question_id);

alter table public.lexicon_contests enable row level security;
alter table public.informant_answers enable row level security;

create policy "lexicon_contests_all_own" on public.lexicon_contests
  for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.courses c where c.id = course_id)
  );

create policy "informant_answers_all_own" on public.informant_answers
  for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.courses c where c.id = course_id)
  );

commit;
