-- Códigos de crédito (regalo por dar opinión) + habilitar el envío de opiniones.
--
-- Objetivo: poder REGALAR créditos a personas seleccionadas mediante códigos de
-- un solo uso por persona, canjeables SOLO si la cuenta ya dejó una opinión.
-- Así se premia el feedback (y el admin decide a quién darle un código mirando
-- los conteos de opiniones del panel).

-- 1) RLS de feedback: la tabla existe con RLS activo pero SIN políticas, así que
--    hoy nadie puede escribir opiniones desde el cliente. Las habilitamos:
--    cada usuario crea y lee únicamente sus propias opiniones. El admin las lee
--    de forma agregada vía admin_overview (SECURITY DEFINER, bypassa RLS).
drop policy if exists "feedback insert own" on public.feedback;
create policy "feedback insert own" on public.feedback
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "feedback select own" on public.feedback;
create policy "feedback select own" on public.feedback
  for select to authenticated
  using (auth.uid() = user_id);

-- 2) Catálogo de códigos y registro de canjes.
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                 -- se guarda normalizado (MAYÚSCULAS)
  credits int not null check (credits > 0),  -- publicaciones que otorga
  max_redemptions int not null default 1 check (max_redemptions > 0),
  redeemed_count int not null default 0,
  note text,                                 -- para quién / motivo (uso interno)
  active boolean not null default true,
  expires_at timestamptz,                    -- opcional
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.promo_codes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  credits_granted int not null,
  created_at timestamptz not null default now(),
  unique (code_id, user_id)                  -- un mismo usuario no canjea 2 veces
);

create index if not exists idx_promo_redemptions_user on public.promo_redemptions(user_id);

alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;

-- promo_codes: sin políticas de cliente. Todo pasa por funciones SECURITY DEFINER.
-- promo_redemptions: el usuario puede ver su propio historial de canjes.
drop policy if exists "redemptions select own" on public.promo_redemptions;
create policy "redemptions select own" on public.promo_redemptions
  for select to authenticated
  using (auth.uid() = user_id);

-- 3) Canjear un código (usuario). Requiere ≥1 opinión previa.
create or replace function public.redeem_promo_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_code public.promo_codes;
  v_balance int;
  v_norm text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
begin
  if uid is null then
    raise exception 'Debes iniciar sesión.' using errcode = '42501';
  end if;

  if v_norm = '' then
    raise exception 'Escribe un código.' using errcode = 'P0001';
  end if;

  -- Requisito: haber dejado al menos una opinión.
  if not exists (select 1 from public.feedback f where f.user_id = uid) then
    raise exception 'Primero déjanos tu opinión para poder canjear un código.' using errcode = 'P0001';
  end if;

  select * into v_code
    from public.promo_codes
   where upper(code) = v_norm
   for update;

  if not found or not v_code.active then
    raise exception 'Código inválido o inactivo.' using errcode = 'P0001';
  end if;

  if v_code.expires_at is not null and v_code.expires_at < now() then
    raise exception 'Este código ya venció.' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.promo_redemptions r where r.code_id = v_code.id and r.user_id = uid) then
    raise exception 'Ya canjeaste este código.' using errcode = 'P0001';
  end if;

  if v_code.redeemed_count >= v_code.max_redemptions then
    raise exception 'Este código ya alcanzó su límite de usos.' using errcode = 'P0001';
  end if;

  insert into public.promo_redemptions (code_id, user_id, credits_granted)
  values (v_code.id, uid, v_code.credits);

  update public.promo_codes
     set redeemed_count = redeemed_count + 1
   where id = v_code.id;

  update public.profiles
     set credits = coalesce(credits, 0) + v_code.credits
   where id = uid
   returning credits into v_balance;

  return jsonb_build_object('ok', true, 'credits_added', v_code.credits, 'new_balance', v_balance);
end;
$$;

-- 4) Generar códigos (admin). Devuelve la lista de códigos creados para repartir.
create or replace function public.admin_create_promo_codes(
  p_credits int,
  p_count int default 1,
  p_note text default null,
  p_expires_at timestamptz default null,
  p_max_redemptions int default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codes text[] := '{}';
  v_code text;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sin O/0/I/1/L ambiguos
  v_len int := 8;
  i int;
  j int;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_credits is null or p_credits <= 0 then
    raise exception 'La cantidad de créditos debe ser mayor a 0.' using errcode = 'P0001';
  end if;
  if p_count is null or p_count < 1 or p_count > 200 then
    raise exception 'La cantidad de códigos debe estar entre 1 y 200.' using errcode = 'P0001';
  end if;

  for i in 1..p_count loop
    loop
      v_code := '';
      for j in 1..v_len loop
        v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
      end loop;
      begin
        insert into public.promo_codes (code, credits, max_redemptions, note, expires_at, created_by)
        values (v_code, p_credits, greatest(coalesce(p_max_redemptions, 1), 1), p_note, p_expires_at, auth.uid());
        v_codes := array_append(v_codes, v_code);
        exit;                       -- código único insertado: salimos del reintento
      exception when unique_violation then
        -- colisión (rara): reintentar con otro código
      end;
    end loop;
  end loop;

  return jsonb_build_object('ok', true, 'codes', to_jsonb(v_codes), 'credits', p_credits, 'count', coalesce(array_length(v_codes, 1), 0));
end;
$$;

-- 5) Listar códigos con su estado y quién los canjeó (admin).
create or replace function public.admin_list_promo_codes()
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

  select coalesce(jsonb_agg(c order by (c->>'created_at') desc), '[]'::jsonb) into result
  from (
    select jsonb_build_object(
      'id', pc.id,
      'code', pc.code,
      'credits', pc.credits,
      'max_redemptions', pc.max_redemptions,
      'redeemed_count', pc.redeemed_count,
      'note', pc.note,
      'active', pc.active,
      'expires_at', pc.expires_at,
      'created_at', pc.created_at,
      'redeemed_by', (
        select coalesce(jsonb_agg(jsonb_build_object('email', p.email, 'at', r.created_at) order by r.created_at desc), '[]'::jsonb)
        from public.promo_redemptions r
        join public.profiles p on p.id = r.user_id
        where r.code_id = pc.id
      )
    ) as c
    from public.promo_codes pc
  ) t;

  return result;
end;
$$;

-- 6) Activar/desactivar un código (admin).
create or replace function public.admin_set_promo_active(p_code_id uuid, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  update public.promo_codes set active = p_active where id = p_code_id;
  return jsonb_build_object('ok', true, 'id', p_code_id, 'active', p_active);
end;
$$;

-- 7) Permisos.
revoke all on function public.redeem_promo_code(text) from public, anon;
grant execute on function public.redeem_promo_code(text) to authenticated;

revoke all on function public.admin_create_promo_codes(int, int, text, timestamptz, int) from public, anon;
grant execute on function public.admin_create_promo_codes(int, int, text, timestamptz, int) to authenticated;

revoke all on function public.admin_list_promo_codes() from public, anon;
grant execute on function public.admin_list_promo_codes() to authenticated;

revoke all on function public.admin_set_promo_active(uuid, boolean) from public, anon;
grant execute on function public.admin_set_promo_active(uuid, boolean) to authenticated;

-- 8) admin_overview: incluye conteo de opiniones (total y por usuario).
--    (Se redefine aquí para dejar el repositorio en sync con la base.)
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
      'total_feedback',   (select count(*) from feedback),
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
          'feedback', (select count(*) from feedback f where f.user_id = p.id),
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
