/*
# Integración Mercado Pago — Esquema de Pagos

Agrega el soporte de cobros (suscripción mensual + compra de créditos) sobre el
modelo existente de `profiles` (que ya maneja `plan` y `credits`).

1. Columnas nuevas en `profiles`
  - `mp_preapproval_id`: id de la suscripción (preapproval) activa en Mercado Pago.
  - `plan_status`: estado del plan ('inactive' | 'pending' | 'active' | 'paused' | 'cancelled').
  - `plan_started_at`: cuándo se activó la suscripción.
  - `plan_expires_at`: hasta cuándo es válido el plan (para cortes por impago).

2. Tablas nuevas
  - `payments`: registro de cada pago aprobado. `mp_payment_id` es UNIQUE para
    garantizar idempotencia (el webhook puede llegar varias veces).
  - `webhook_logs`: auditoría cruda de cada notificación recibida de Mercado Pago.

3. Seguridad
  - El usuario solo puede LEER sus propios `payments`.
  - Las escrituras las hace la Edge Function `mp-webhook` con el Service Role
    (bypassa RLS), nunca el cliente.
  - `webhook_logs` no es accesible desde el cliente (solo service role).

Notas: todo usa `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` para ser idempotente
y no destructivo.
*/

-- 1. Columnas de suscripción en profiles -------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='mp_preapproval_id') THEN
    ALTER TABLE public.profiles ADD COLUMN mp_preapproval_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='plan_status') THEN
    ALTER TABLE public.profiles ADD COLUMN plan_status text DEFAULT 'inactive';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='plan_started_at') THEN
    ALTER TABLE public.profiles ADD COLUMN plan_started_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='plan_expires_at') THEN
    ALTER TABLE public.profiles ADD COLUMN plan_expires_at timestamptz;
  END IF;
END $$;

-- 2. Tabla de pagos (idempotente por mp_payment_id) --------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  mp_payment_id text UNIQUE NOT NULL,
  tipo text NOT NULL,                 -- 'subscription' | 'credits'
  status text NOT NULL,               -- estado reportado por Mercado Pago
  amount numeric,
  currency text,
  credits_added int DEFAULT 0,
  raw jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payments' AND policyname='Users can view own payments') THEN
    CREATE POLICY "Users can view own payments" ON public.payments
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Auditoría cruda de webhooks (solo service role) -------------------------
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text DEFAULT 'mercadopago',
  topic text,
  resource_id text,
  signature_valid boolean,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
-- Sin políticas: nadie con rol anon/authenticated puede leerla. El service role bypassa RLS.

-- Índice para búsquedas por usuario en payments
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
