-- ============================================================================
-- Fluente365 - remove o default 'en' de course_id (Fase E1, divida do
-- docs/ADR-002-multi-idioma.md). O app agora informa o courseId em toda
-- escrita; esquecer o curso passa a falhar (23502) em vez de gravar em 'en'.
-- ============================================================================

begin;

-- O trigger de cadastro dependia do default: passa a informar 'en' explicitamente
-- (todo aluno novo comeca no curso de ingles; o vmw e aberto depois, sob demanda).
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

  insert into public.student_models (user_id, course_id) values (new.id, 'en');
  insert into public.gamification (user_id, course_id) values (new.id, 'en');

  return new;
end;
$$;

alter table public.student_models alter column course_id drop default;
alter table public.topic_mastery alter column course_id drop default;
alter table public.srs_cards alter column course_id drop default;
alter table public.error_log alter column course_id drop default;
alter table public.study_sessions alter column course_id drop default;
alter table public.gamification alter column course_id drop default;
alter table public.content_units alter column course_id drop default;
alter table public.content_lessons alter column course_id drop default;
alter table public.content_jw_refs alter column course_id drop default;
alter table public.admin_costs alter column course_id drop default;

commit;
