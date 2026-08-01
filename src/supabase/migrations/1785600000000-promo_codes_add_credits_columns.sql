-- Fix: no se podían generar códigos ("columna faltante").
-- La tabla promo_codes YA existía con un diseño distinto (free_month:
-- tipo/duration_days/max_uses/uses), así que el "create table if not exists"
-- de la migración de códigos por créditos no agregó las columnas que usan sus
-- funciones (admin_create_promo_codes / redeem_promo_code). Las añadimos aquí.
alter table public.promo_codes add column if not exists credits int;
alter table public.promo_codes add column if not exists max_redemptions int not null default 1;
alter table public.promo_codes add column if not exists redeemed_count int not null default 0;

-- Refresca el caché de esquema de PostgREST.
notify pgrst, 'reload schema';
