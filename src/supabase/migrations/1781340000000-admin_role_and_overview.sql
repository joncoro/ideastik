-- Panel de administrador: rol is_admin + funciones seguras de métricas y gestión.

-- 1) Rol de admin en profiles
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- 2) Sembrar al primer admin (dueño de la app) ANTES del trigger de protección
update public.profiles
set is_admin = true
where lower(email) = lower('johnjavier.contrerasroa@gmail.com');

-- 3) Proteger is_admin: ningún cliente puede auto-promoverse.
--    Solo cambia si se activa el flag de sesión (que solo activan funciones
--    SECURITY DEFINER controladas) o desde una conexión directa/postgres.
create or replace function public.protect_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and coalesce(current_setting('app.allow_admin_change', true), '') <> '1'
     and auth.role() = 'authenticated' then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_is_admin on public.profiles;
create trigger trg_protect_is_admin
before update on public.profiles
for each row execute function public.protect_is_admin();

-- 4) Métricas del panel de admin (verifica que quien llama sea admin)
create or replace function public.admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'kpis', jsonb_build_object(
      'total_users',      (select count(*) from profiles),
      'paid_users',       (select count(*) from profiles where coalesce(plan,'FREE') <> 'FREE'),
      'active_plans',     (select count(*) from profiles where plan_status = 'active'),
      'total_businesses', (select count(*) from businesses),
      'total_grids',      (select count(*) from grids),
      'total_posts',      (select count(*) from posts),
      'published_posts',  (select count(*) from posts where status = 'PUBLISHED'),
      'total_historias',  (select count(*) from historias),
      'new_users_7d',     (select count(*) from profiles where created_at > now() - interval '7 days'),
      'new_posts_7d',     (select count(*) from posts where created_at > now() - interval '7 days')
    ),
    'by_plan', (
      select coalesce(jsonb_agg(jsonb_build_object('plan', plan, 'count', c) order by c desc), '[]'::jsonb)
      from (select coalesce(plan,'FREE') as plan, count(*) c from profiles group by 1) t
    ),
    'signups_daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d), '[]'::jsonb)
      from (
        select date_trunc('day', created_at)::date as d, count(*) c
        from profiles
        where created_at > now() - interval '30 days'
        group by 1
      ) t
    ),
    'users', (
      select coalesce(jsonb_agg(u order by (u->>'created_at') desc), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'id', p.id,
          'email', p.email,
          'name', p.name,
          'plan', coalesce(p.plan,'FREE'),
          'plan_status', p.plan_status,
          'is_admin', p.is_admin,
          'credits', p.credits,
          'created_at', p.created_at,
          'negocios', count(distinct b.id),
          'posts', count(distinct po.id),
          'historias', count(distinct h.id),
          'ultima_actividad', greatest(p.created_at, max(po.created_at), max(h.created_at))
        ) as u
        from profiles p
        left join businesses b on b.user_id = p.id
        left join grids g on g.business_id = b.id
        left join posts po on po.grid_id = g.id
        left join historias h on h.business_id = b.id
        group by p.id
      ) t
    )
  ) into result;

  return result;
end;
$$;

-- 5) Asignar/quitar admin por email (solo un admin puede llamarla)
create or replace function public.admin_set_role(target_email text, make_admin boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  affected int;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  perform set_config('app.allow_admin_change', '1', true);
  update public.profiles
  set is_admin = make_admin
  where lower(email) = lower(target_email);
  get diagnostics affected = row_count;
  perform set_config('app.allow_admin_change', '', true);

  return jsonb_build_object('updated', affected, 'email', target_email, 'is_admin', make_admin);
end;
$$;

-- 6) Permisos: solo usuarios autenticados pueden invocarlas; el guard interno hace el resto
revoke all on function public.admin_overview() from public, anon;
revoke all on function public.admin_set_role(text, boolean) from public, anon;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_set_role(text, boolean) to authenticated;
