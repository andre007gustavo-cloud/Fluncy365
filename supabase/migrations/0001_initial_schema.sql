-- ============================================================================
-- Fluente365 - schema inicial (Fase 0)
-- Equivale a secao 12 do planejamento, traduzida de Firestore para Postgres.
--
-- Regra de ouro: TODA tabela tem RLS ligada. Sem policy, ninguem le nada.
-- O proxy /api/tutor usa a service_role key, que ignora RLS por design.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.skill as enum ('reading', 'listening', 'writing', 'speaking');
create type public.topic_status as enum ('locked', 'learning', 'review', 'mastered');
create type public.srs_item_type as enum ('word', 'phrase', 'structure');
create type public.lesson_status as enum ('seed', 'auto', 'approved');
create type public.jw_ref_type as enum ('article', 'audio', 'video');

-- ---------------------------------------------------------------------------
-- Helper: e admin? (custom claim no JWT)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'admin')::boolean, false);
$$;

-- ---------------------------------------------------------------------------
-- Perfil do usuario
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  settings jsonb not null default '{"reminderTime": "20:00", "ttsVoice": null}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Cria o perfil automaticamente quando alguem se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  );

  insert into public.student_models (user_id) values (new.id);
  insert into public.gamification (user_id) values (new.id);

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Modelo do aluno (secao 8.1)
-- ---------------------------------------------------------------------------
create table public.student_models (
  user_id uuid primary key references auth.users (id) on delete cascade,
  levels jsonb not null
    default '{"reading": 1.0, "listening": 1.0, "writing": 1.0, "speaking": 1.0}'::jsonb,
  vocab_size integer not null default 0 check (vocab_size >= 0),
  pace jsonb not null
    default '{"avgSecondsPerExercise": 0, "sessionCompletionRate": 0, "usualHour": null}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.student_models enable row level security;

create policy "student_models_all_own" on public.student_models
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Dominio por topico gramatical (secao 8.2)
-- ---------------------------------------------------------------------------
create table public.topic_mastery (
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id text not null,
  accuracy real not null default 0 check (accuracy between 0 and 1),
  attempts integer not null default 0 check (attempts >= 0),
  sessions integer not null default 0 check (sessions >= 0),
  last_seen timestamptz,
  status public.topic_status not null default 'locked',
  primary key (user_id, topic_id)
);

alter table public.topic_mastery enable row level security;

create policy "topic_mastery_all_own" on public.topic_mastery
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Cartoes SRS (secao 8.4)
-- ---------------------------------------------------------------------------
create table public.srs_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  front text not null,
  back text not null,
  type public.srs_item_type not null default 'word',
  ease real not null default 2.5 check (ease >= 1.3),
  interval_days integer not null default 0 check (interval_days >= 0),
  due_at timestamptz not null default now(),
  lapses integer not null default 0 check (lapses >= 0),
  source_lesson_id text,
  created_at timestamptz not null default now()
);

alter table public.srs_cards enable row level security;

create policy "srs_cards_all_own" on public.srs_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- A consulta mais quente do app: "meus cartoes vencidos, do mais antigo".
create index srs_cards_due_idx on public.srs_cards (user_id, due_at);

-- ---------------------------------------------------------------------------
-- Log de erros do aluno (secao 8.1)
-- ---------------------------------------------------------------------------
create table public.error_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  skill public.skill not null,
  example text not null default '',
  count integer not null default 1 check (count > 0),
  last_at timestamptz not null default now(),
  primary key (user_id, code)
);

alter table public.error_log enable row level security;

create policy "error_log_all_own" on public.error_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index error_log_recent_idx on public.error_log (user_id, last_at desc);

-- ---------------------------------------------------------------------------
-- Sessoes de estudo (uma por dia)
-- ---------------------------------------------------------------------------
create table public.study_sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  plan jsonb not null default '{}'::jsonb,
  results jsonb not null default '[]'::jsonb,
  xp integer not null default 0 check (xp >= 0),
  duration_sec integer not null default 0 check (duration_sec >= 0),
  completed boolean not null default false,
  rescue boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.study_sessions enable row level security;

create policy "study_sessions_all_own" on public.study_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Gamificacao: XP, avatar e streak (secao 10)
-- ---------------------------------------------------------------------------
create table public.gamification (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp_total integer not null default 0 check (xp_total >= 0),
  evolution_xp integer not null default 0 check (evolution_xp >= 0),
  avatar_stage smallint not null default 0 check (avatar_stage between 0 and 6),
  unlocked_traits text[] not null default '{}',
  streak jsonb not null
    default '{"current": 0, "best": 0, "shieldsLeft": 2, "lastDay": null}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.gamification enable row level security;

create policy "gamification_all_own" on public.gamification
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Conteudo compartilhado: leitura para autenticados, escrita so service_role
-- ---------------------------------------------------------------------------
create table public.content_units (
  id text primary key,
  month smallint not null check (month between 1 and 12),
  week smallint not null check (week between 1 and 4),
  level real not null check (level between 1 and 6),
  grammar_topics text[] not null default '{}',
  vocab_list text[] not null default '{}',
  pt_error_targets text[] not null default '{}',
  jw_refs text[] not null default '{}',
  murphy_ref text,
  mastery_criteria jsonb not null default '{"minAccuracy": 0.85, "minAttempts": 12}'::jsonb
);

create table public.content_lessons (
  id text primary key,
  unit_id text not null references public.content_units (id) on delete cascade,
  day_index smallint not null check (day_index between 1 and 7),
  blocks jsonb not null default '[]'::jsonb,
  exercises jsonb not null default '[]'::jsonb,
  status public.lesson_status not null default 'seed',
  generated_by text,
  version integer not null default 1,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (unit_id, day_index, version)
);

create table public.content_jw_refs (
  id text primary key,
  url text not null,
  title text not null,
  type public.jw_ref_type not null,
  level real not null check (level between 1 and 6),
  minutes smallint not null check (minutes > 0),
  topics text[] not null default '{}'
);

alter table public.content_units enable row level security;
alter table public.content_lessons enable row level security;
alter table public.content_jw_refs enable row level security;

create policy "content_units_read" on public.content_units
  for select to authenticated using (true);
create policy "content_lessons_read" on public.content_lessons
  for select to authenticated using (true);
create policy "content_jw_refs_read" on public.content_jw_refs
  for select to authenticated using (true);

-- Sem policy de insert/update/delete: so a service_role (proxy) escreve.

-- ---------------------------------------------------------------------------
-- Custos de IA (secao 14.3) - so admin le
-- ---------------------------------------------------------------------------
create table public.admin_costs (
  day date primary key,
  calls integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  usd numeric(10, 4) not null default 0,
  by_service jsonb not null default '{}'::jsonb
);

alter table public.admin_costs enable row level security;

create policy "admin_costs_read_admin" on public.admin_costs
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Trigger de criacao de usuario (declarado por ultimo: depende das tabelas)
-- ---------------------------------------------------------------------------
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
