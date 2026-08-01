-- Broadcast de avisos: el admin escribe un título+mensaje y se crea una
-- notificación in-app para TODOS los usuarios (aparece en su campana).
-- Nota: esto es notificación dentro de la app; el push al celular con la app
-- cerrada requiere PWA + Web Push (VAPID), que es un paso posterior.
create or replace function public.admin_broadcast_notification(p_title text, p_message text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_message), '') = '' then
    raise exception 'Título y mensaje son obligatorios.' using errcode = 'P0001';
  end if;
  insert into public.notifications (user_id, title, message, type)
  select id, p_title, p_message, 'ANNOUNCEMENT' from public.profiles;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'sent', n);
end;
$$;

revoke all on function public.admin_broadcast_notification(text, text) from public, anon;
grant execute on function public.admin_broadcast_notification(text, text) to authenticated;
