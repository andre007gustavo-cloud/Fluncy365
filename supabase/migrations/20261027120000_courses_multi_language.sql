-- ============================================================================
-- Fluente365 - multi-idioma (Fase F0.2, ver docs/ADR-002-multi-idioma.md)
-- Cria public.courses, adiciona course_id nas tabelas de aluno/conteudo e
-- a funcao de guarda tables_without_rls().
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Cursos
-- ---------------------------------------------------------------------------
create table public.courses (
  id text primary key,
  name text not null,
  ai_level text not null check (ai_level in ('full', 'corpus_only')),
  audio text not null check (audio in ('tts', 'link_only')),
  visibility text not null check (visibility in ('shared', 'owner_only'))
);

alter table public.courses enable row level security;

create policy "courses_read" on public.courses
  for select to authenticated
  using (visibility = 'shared' or public.is_admin());

-- Sem policy de insert/update/delete: so migrations e service_role alteram.

-- Semeado antes dos FKs: as linhas existentes passam a apontar para 'en'.
insert into public.courses (id, name, ai_level, audio, visibility)
values ('en', 'Inglês', 'full', 'tts', 'shared');

-- ---------------------------------------------------------------------------
-- course_id nas tabelas existentes
-- O default 'en' e temporario (divida do ADR-002): handle_new_user e os
-- repositorios atuais ainda nao informam course_id.
-- ---------------------------------------------------------------------------
alter table public.student_models
  add column course_id text not null default 'en' references public.courses (id);
alter table public.topic_mastery
  add column course_id text not null default 'en' references public.courses (id);
alter table public.srs_cards
  add column course_id text not null default 'en' references public.courses (id);
alter table public.error_log
  add column course_id text not null default 'en' references public.courses (id);
alter table public.study_sessions
  add column course_id text not null default 'en' references public.courses (id);
alter table public.gamification
  add column course_id text not null default 'en' references public.courses (id);
alter table public.content_units
  add column course_id text not null default 'en' references public.courses (id);
alter table public.content_lessons
  add column course_id text not null default 'en' references public.courses (id);
alter table public.content_jw_refs
  add column course_id text not null default 'en' references public.courses (id);
alter table public.admin_costs
  add column course_id text not null default 'en' references public.courses (id);

-- ---------------------------------------------------------------------------
-- Novas chaves primarias (nomes padrao <tabela>_pkey da 0001)
-- ---------------------------------------------------------------------------
alter table public.student_models
  drop constraint student_models_pkey,
  add primary key (user_id, course_id);

alter table public.gamification
  drop constraint gamification_pkey,
  add primary key (user_id, course_id);

alter table public.topic_mastery
  drop constraint topic_mastery_pkey,
  add primary key (user_id, course_id, topic_id);

alter table public.error_log
  drop constraint error_log_pkey,
  add primary key (user_id, course_id, code);

alter table public.study_sessions
  drop constraint study_sessions_pkey,
  add primary key (user_id, course_id, day);

alter table public.admin_costs
  drop constraint admin_costs_pkey,
  add primary key (day, course_id);

-- ---------------------------------------------------------------------------
-- Indices
-- ---------------------------------------------------------------------------
drop index public.srs_cards_due_idx;
create index srs_cards_due_idx on public.srs_cards (user_id, course_id, due_at);

drop index public.error_log_recent_idx;
create index error_log_recent_idx on public.error_log (user_id, course_id, last_at desc);

-- ---------------------------------------------------------------------------
-- Guarda: lista tabelas de public sem RLS (usada pelo teste de integracao)
-- ---------------------------------------------------------------------------
create or replace function public.tables_without_rls()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select c.relname::text
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and not c.relrowsecurity
  order by c.relname;
$$;

revoke execute on function public.tables_without_rls() from public, anon, authenticated;
grant execute on function public.tables_without_rls() to service_role;

commit;
