-- ============================================================================
-- Fluente365 - policies respeitam a visibilidade do curso (ADR-002)
-- FK ignora RLS: sem estas condicoes, um nao admin enxergaria conteudo de um
-- curso owner_only e poderia gravar dados proprios nele. O subselect em
-- public.courses ja passa pela RLS de courses (shared ou admin).
-- handle_new_user so insere em profiles (sem course_id), nao e afetado.
-- ============================================================================

begin;

-- Conteudo: leitura somente de cursos visiveis ao usuario que consulta.
drop policy "content_units_read" on public.content_units;
create policy "content_units_read" on public.content_units
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id));

drop policy "content_lessons_read" on public.content_lessons;
create policy "content_lessons_read" on public.content_lessons
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id));

drop policy "content_jw_refs_read" on public.content_jw_refs;
create policy "content_jw_refs_read" on public.content_jw_refs
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id));

-- Tabelas do aluno: a escrita exige curso visivel (a leitura segue por dono).
drop policy "student_models_all_own" on public.student_models;
create policy "student_models_all_own" on public.student_models
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.courses c where c.id = course_id)
  );

drop policy "topic_mastery_all_own" on public.topic_mastery;
create policy "topic_mastery_all_own" on public.topic_mastery
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.courses c where c.id = course_id)
  );

drop policy "srs_cards_all_own" on public.srs_cards;
create policy "srs_cards_all_own" on public.srs_cards
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.courses c where c.id = course_id)
  );

drop policy "error_log_all_own" on public.error_log;
create policy "error_log_all_own" on public.error_log
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.courses c where c.id = course_id)
  );

drop policy "study_sessions_all_own" on public.study_sessions;
create policy "study_sessions_all_own" on public.study_sessions
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.courses c where c.id = course_id)
  );

drop policy "gamification_all_own" on public.gamification;
create policy "gamification_all_own" on public.gamification
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.courses c where c.id = course_id)
  );

commit;
