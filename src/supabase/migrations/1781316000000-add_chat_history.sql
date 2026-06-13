/* 
# Soporte para Historial de Chat y Estado Agéntico
1. Cambios en Tablas
  - `businesses_1781308891343`:
    - `chat_history`: Columna JSONB para persistir la conversación.
    - `current_fase`: Para rastrear el estado exacto de la FSM.
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses_1781308891343' AND column_name = 'chat_history'
  ) THEN 
    ALTER TABLE businesses_1781308891343 ADD COLUMN chat_history jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses_1781308891343' AND column_name = 'current_fase'
  ) THEN 
    ALTER TABLE businesses_1781308891343 ADD COLUMN current_fase text DEFAULT 'DATOS_NOMBRE';
  END IF;
END $$;