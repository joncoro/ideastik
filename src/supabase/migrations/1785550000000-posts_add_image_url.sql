-- La columna image_url solo existía en la tabla con el nombre antiguo
-- (posts_1781308891343); la tabla actual `posts` no la tenía, por lo que
-- guardar la imagen generada/retocada fallaba ("Could not find the 'image_url'
-- column of 'posts' in the schema cache"). La agregamos.
alter table public.posts add column if not exists image_url text;

-- Refresca el caché de esquema de PostgREST para que la API la reconozca ya.
notify pgrst, 'reload schema';
