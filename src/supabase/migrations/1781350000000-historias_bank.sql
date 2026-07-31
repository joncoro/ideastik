/*
# Banco de historias / material real de marca (memoria del negocio)

1. Nueva tabla
  - `historias`: guarda el material REAL que el dueño aporta (anécdotas, decisiones
    técnicas, casos, datos, aprendizajes). La IA lo usa como PRIMERA fuente al generar
    ideas y copy, en vez de inventar. Es la base de la "memoria" de la marca.

2. Seguridad
  - RLS habilitado. El usuario solo gestiona historias de sus propios negocios.

Notas: idempotente (IF NOT EXISTS). No destructivo.
*/

CREATE TABLE IF NOT EXISTS public.historias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  texto text NOT NULL,
  tipo text,
  origen text DEFAULT 'editor',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.historias ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'historias'
      AND policyname = 'Users manage historias of their businesses'
  ) THEN
    CREATE POLICY "Users manage historias of their businesses" ON public.historias
      USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = historias.business_id AND b.user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = historias.business_id AND b.user_id = auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS historias_business_id_idx ON public.historias(business_id);
