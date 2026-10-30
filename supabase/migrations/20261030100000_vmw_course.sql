-- ============================================================================
-- Fluente365 - curso Emakhuwa (vmw) (Fase E1, ver docs/ADR-004-modulo-emakhuwa.md)
-- Aceita courses.audio = 'downloaded' (audio do acervo autorizado, baixado) e
-- semeia o curso vmw. Os valores 'corpus_only' (ai_level) e 'owner_only'
-- (visibility) ja existem nos checks atuais, entao nao sao ampliados.
-- ============================================================================

begin;

-- O check de audio foi criado inline em 20261027120000 (nome padrao
-- courses_audio_check). O bloco o localiza pelo conteudo e falha alto se nao achar.
do $$
declare
  audio_check text;
begin
  select c.conname
    into audio_check
    from pg_constraint c
   where c.conrelid = 'public.courses'::regclass
     and c.contype = 'c'
     and pg_get_constraintdef(c.oid) like '%audio%'
     and pg_get_constraintdef(c.oid) like '%link_only%';

  if audio_check is null then
    raise exception 'Check de courses.audio nao encontrado; migration abortada';
  end if;

  execute format('alter table public.courses drop constraint %I', audio_check);
end
$$;

alter table public.courses
  add constraint courses_audio_check
  check (audio in ('tts', 'link_only', 'downloaded'));

-- owner_only: so admin ve o curso ate a distribuicao ser autorizada (ADR-005).
insert into public.courses (id, name, ai_level, audio, visibility)
values ('vmw', 'Emakhuwa', 'corpus_only', 'downloaded', 'owner_only')
on conflict (id) do nothing;

commit;
