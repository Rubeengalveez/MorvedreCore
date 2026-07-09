-- 0027_news_storage.sql
-- Bucket de Storage para imágenes de noticias
-- Path: news/{post_id}/{filename}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'news',
  'news',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS en storage.objects para el bucket 'news'
drop policy if exists news_storage_select on storage.objects;
create policy news_storage_select
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'news');

drop policy if exists news_storage_insert on storage.objects;
create policy news_storage_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'news'
    and (storage.foldername(name))[1] = 'news'
    and public.is_admin()
  );

drop policy if exists news_storage_update on storage.objects;
create policy news_storage_update
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'news' and public.is_admin())
  with check (bucket_id = 'news' and public.is_admin());

drop policy if exists news_storage_delete on storage.objects;
create policy news_storage_delete
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'news' and public.is_admin());
