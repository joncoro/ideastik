/* 
# Sincronización Integral del Esquema del Wizard
Este script asegura que la tabla `businesses` tenga todas las columnas necesarias
para el funcionamiento correcto de la FSM y el guardado de selecciones del usuario.

1. Columnas Agregadas (si no existen):
  - `current_fase`: Rastreo del estado actual del Wizard (FSM).
  - `propuesta_valor`: La propuesta de valor final elegida por el usuario.
  - `narrativa_ok`: Feedback o confirmación de la narrativa de marca.
  - `pilares_seleccionados`: Los 3 pilares específicos elegidos por el usuario (JSONB).
  - `fecha_inicio`: Fecha seleccionada para iniciar el calendario (timestamptz).
  - `ideas`: Almacena las ideas de contenido generadas por la IA (JSONB).
  - `estrategia`: Almacena la estrategia de canales y tonos (JSONB).

2. Notas:
  - Se usa `ADD COLUMN IF NOT EXISTS` para máxima seguridad.
  - No se realizan operaciones destructivas (DROP).
*/

DO $$ 
BEGIN 
  -- 1. Estado de la Máquina de Estados (FSM)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='current_fase') THEN
    ALTER TABLE public.businesses ADD COLUMN current_fase text DEFAULT 'DATOS_NOMBRE';
  END IF;

  -- 2. Propuesta de Valor Elegida (El error reportado)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='propuesta_valor') THEN
    ALTER TABLE public.businesses ADD COLUMN propuesta_valor text;
  END IF;

  -- 3. Confirmación de Narrativa
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='narrativa_ok') THEN
    ALTER TABLE public.businesses ADD COLUMN narrativa_ok text;
  END IF;

  -- 4. Pilares Seleccionados (Array de objetos con nombre, tipo y descripción)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='pilares_seleccionados') THEN
    ALTER TABLE public.businesses ADD COLUMN pilares_seleccionados jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- 5. Fecha de Inicio del Calendario
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='fecha_inicio') THEN
    ALTER TABLE public.businesses ADD COLUMN fecha_inicio timestamptz;
  END IF;

  -- 6. Estrategia (Asegurar existencia para fase de Estrategia)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='estrategia') THEN
    ALTER TABLE public.businesses ADD COLUMN estrategia jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- 7. Ideas (Asegurar existencia para fase de Ideas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='ideas') THEN
    ALTER TABLE public.businesses ADD COLUMN ideas jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- 8. Chat History (Opcional, para persistencia de contexto si se prefiere a la tabla wizard_messages)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='chat_history') THEN
    ALTER TABLE public.businesses ADD COLUMN chat_history jsonb DEFAULT '[]'::jsonb;
  END IF;

END $$;