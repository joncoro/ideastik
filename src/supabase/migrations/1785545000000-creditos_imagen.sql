-- Control de costo de la generación de imágenes con IA.
-- Cada imagen consume 1 crédito para usuarios FREE; MENSUAL es ilimitado.
-- La verificación/descuento es atómica y en el servidor (no se puede saltar
-- desde el cliente). Incluye reposición para reembolsar si la imagen falla.

create or replace function public.consumir_credito_imagen()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_plan text;
  v_credits int;
begin
  if uid is null then
    raise exception 'Debes iniciar sesión.' using errcode = '42501';
  end if;

  select coalesce(plan, 'FREE'), coalesce(credits, 0)
    into v_plan, v_credits
    from public.profiles where id = uid
    for update;

  -- Plan MENSUAL: sin descuento (acceso ilimitado, coherente con el plan).
  if v_plan = 'MENSUAL' then
    return jsonb_build_object('ok', true, 'ilimitado', true);
  end if;

  if v_credits <= 0 then
    raise exception 'Sin créditos para generar imágenes.' using errcode = 'P0001';
  end if;

  update public.profiles set credits = credits - 1 where id = uid
    returning credits into v_credits;
  return jsonb_build_object('ok', true, 'ilimitado', false, 'new_balance', v_credits);
end;
$$;

-- Reembolsa 1 crédito (solo FREE) cuando la generación falla tras el descuento.
create or replace function public.reponer_credito_imagen()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_plan text;
  v_credits int;
begin
  if uid is null then
    raise exception 'Debes iniciar sesión.' using errcode = '42501';
  end if;
  select coalesce(plan, 'FREE') into v_plan from public.profiles where id = uid;
  if v_plan = 'MENSUAL' then
    return jsonb_build_object('ok', true);
  end if;
  update public.profiles set credits = coalesce(credits, 0) + 1 where id = uid
    returning credits into v_credits;
  return jsonb_build_object('ok', true, 'new_balance', v_credits);
end;
$$;

revoke all on function public.consumir_credito_imagen() from public, anon;
grant execute on function public.consumir_credito_imagen() to authenticated;
revoke all on function public.reponer_credito_imagen() from public, anon;
grant execute on function public.reponer_credito_imagen() to authenticated;
