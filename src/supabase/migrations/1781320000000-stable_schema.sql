/* 
# Migración a Nombres Estables 

1. Cambios
  - Renombra tablas con sufijos a nombres limpios (profiles, businesses, grids, posts, notifications).
  - Crea tabla wizard_messages para un manejo más robusto del historial.
  - Asegura que las políticas de RLS se mantengan.

2. Tablas Finales
  - profiles
  - businesses
  - grids
  - posts
  - notifications
  - reminder_settings
  - wizard_messages
*/

-- Renombrar tablas existentes si existen con el sufijo
DO $$ 
BEGIN
  -- Profiles
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'profiles_1781308891343') THEN
    ALTER TABLE profiles_1781308891343 RENAME TO profiles;
  END IF;

  -- Businesses
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'businesses_1781308891343') THEN
    ALTER TABLE businesses_1781308891343 RENAME TO businesses;
  END IF;

  -- Grids
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'grids_1781308891343') THEN
    ALTER TABLE grids_1781308891343 RENAME TO grids;
  END IF;

  -- Posts
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'posts_1781308891343') THEN
    ALTER TABLE posts_1781308891343 RENAME TO posts;
  END IF;

  -- Notifications
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'notifications_1781309249490') THEN
    ALTER TABLE notifications_1781309249490 RENAME TO notifications;
  END IF;

  -- Reminder Settings
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'reminder_settings_1781309249490') THEN
    ALTER TABLE reminder_settings_1781309249490 RENAME TO reminder_settings;
  END IF;
END $$;

-- Crear tabla wizard_messages si no existe
CREATE TABLE IF NOT EXISTS wizard_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  role text NOT NULL, -- 'agent' o 'user'
  content text NOT NULL,
  widget jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wizard_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage messages of their businesses" ON wizard_messages
  USING (EXISTS (
    SELECT 1 FROM businesses b 
    WHERE b.id = wizard_messages.business_id AND b.user_id = auth.uid()
  ));