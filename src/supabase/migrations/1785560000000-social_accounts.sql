-- Andamiaje para publicar en redes (Instagram / Facebook).
-- Guarda la intención de conexión por negocio. Hoy el estado queda 'pendiente'
-- (publicación asistida); cuando la app de Meta esté aprobada, un flujo OAuth
-- llenará external_id/access_token y pondrá status='conectada' para publicar
-- directo, sin cambiar la UI.

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook')),
  username text,
  status text not null default 'pendiente' check (status in ('pendiente', 'conectada', 'desconectada')),
  external_id text,        -- id de la cuenta en Meta (se llena al integrar)
  access_token text,       -- token de Meta (se llena al integrar; nunca se expone al cliente)
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, platform)
);

alter table public.social_accounts enable row level security;

-- El dueño gestiona solo las cuentas de sus propios negocios.
drop policy if exists "social_accounts propias" on public.social_accounts;
create policy "social_accounts propias" on public.social_accounts
  for all to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid()));
