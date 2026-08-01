-- Almacenamiento de imágenes generadas/retocadas de los posts.
-- Bucket público (las imágenes de marketing se muestran con <img src>), pero
-- solo usuarios autenticados pueden subir/actualizar/borrar.

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists "post-images lectura pública" on storage.objects;
create policy "post-images lectura pública" on storage.objects
  for select to public
  using (bucket_id = 'post-images');

drop policy if exists "post-images subir autenticado" on storage.objects;
create policy "post-images subir autenticado" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-images');

drop policy if exists "post-images actualizar autenticado" on storage.objects;
create policy "post-images actualizar autenticado" on storage.objects
  for update to authenticated
  using (bucket_id = 'post-images');

drop policy if exists "post-images borrar autenticado" on storage.objects;
create policy "post-images borrar autenticado" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-images');
