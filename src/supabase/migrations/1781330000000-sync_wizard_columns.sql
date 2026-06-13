/* 
# Sincronización Completa de Columnas del Wizard
1. Cambios en Tablas
  - `businesses`: Agrega todas las columnas faltantes necesarias para el flujo del Wizard:
    - `current_fase`: Rastreo del estado de la máquina de estados.
    - `propuesta_valor`: Almacena la propuesta elegida por el usuario.
    - `narrativa_ok`: Confirmación de la narrativa.
    - `pilares_seleccionados`: Array JSON con los pilares elegidos.
    - `fecha_inicio`: Fecha de inicio del calendario.

2. Notas
  - Se utiliza `ADD COLUMN IF NOT EXISTS` para evitar errores si alguna ya fue creada.
  - Se asegura que los tipos coincidan con los datos enviados desde el frontend (text y jsonb).
*/

DO $$ 
BEGIN 
  -- 1. Fase actual del Wizard
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='current_fase') THEN
    ALTER TABLE public.businesses ADD COLUMN current_fase text DEFAULT 'DATOS_NOMBRE';
  END IF;

  -- 2. Selección de Propuesta de Valor
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='propuesta_valor') THEN
    ALTER TABLE public.businesses ADD COLUMN propuesta_valor text;
  END IF;

  -- 3. Confirmación de Narrativa
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='narrativa_ok') THEN
    ALTER TABLE public.businesses ADD COLUMN narrativa_ok text;
  END IF;

  -- 4. Selección de Pilares (JSONB para guardar el array de objetos)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='pilares_seleccionados') THEN
    ALTER TABLE public.businesses ADD COLUMN pilares_seleccionados jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- 5. Fecha de Inicio del Calendario
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='fecha_inicio') THEN
    ALTER TABLE public.businesses ADD COLUMN fecha_inicio timestamptz;
  END IF;

  -- 6. Asegurar que ideas existe (por si acaso)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='ideas') THEN
    ALTER TABLE public.businesses ADD COLUMN ideas jsonb DEFAULT '{}'::jsonb;
  END IF;

END $$;