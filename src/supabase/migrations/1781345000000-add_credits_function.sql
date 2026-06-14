/*
# Incremento atómico de créditos

Reemplaza el patrón "leer crédito → sumar → escribir" del webhook por una
operación atómica, evitando condiciones de carrera si llegan dos pagos del mismo
usuario casi simultáneos.

Seguridad:
- `SECURITY DEFINER` con `search_path` fijo (evita la alerta del linter).
- Se revoca EXECUTE a `anon` y `authenticated`: solo el Service Role (webhook)
  puede llamarla. Así no queda expuesta vía la API REST pública.
*/

CREATE OR REPLACE FUNCTION public.add_credits(p_user_id uuid, p_amount int)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET credits = COALESCE(credits, 0) + p_amount
  WHERE id = p_user_id;
$$;

REVOKE EXECUTE ON FUNCTION public.add_credits(uuid, int) FROM anon, authenticated;
