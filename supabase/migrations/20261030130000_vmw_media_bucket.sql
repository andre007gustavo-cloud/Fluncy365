-- ============================================================================
-- Fluente365 - bucket privado vmw-media (Fase E1, ver
-- docs/PLANEJAMENTO-EMAKHUWA.md secao 12.5 e docs/ADR-005-acervo-autorizado.md)
--   library/...            midia do acervo: leitura para quem enxerga o curso vmw;
--                          escrita so pela service_role (ignora RLS).
--   users/<auth.uid()>/... gravacoes do proprio usuario: so ele, e so com o curso
--                          vmw visivel (o subselect passa pela RLS de courses).
-- ============================================================================

begin;

insert into storage.buckets (id, name, public)
values ('vmw-media', 'vmw-media', false)
on conflict (id) do nothing;

create policy "vmw_media_library_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vmw-media'
    and (storage.foldername(name))[1] = 'library'
    and exists (select 1 from public.courses c where c.id = 'vmw')
  );

create policy "vmw_media_user_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vmw-media'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (select 1 from public.courses c where c.id = 'vmw')
  );

create policy "vmw_media_user_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vmw-media'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (select 1 from public.courses c where c.id = 'vmw')
  );

create policy "vmw_media_user_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'vmw-media'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (select 1 from public.courses c where c.id = 'vmw')
  )
  with check (
    bucket_id = 'vmw-media'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (select 1 from public.courses c where c.id = 'vmw')
  );

create policy "vmw_media_user_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vmw-media'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (select 1 from public.courses c where c.id = 'vmw')
  );

commit;
