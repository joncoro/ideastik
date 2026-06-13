/* 
# Sistema de Recordatorios y Notificaciones
1. New Tables
  - `reminder_settings_1781309249490`: Preferencias de notificación por negocio.
  - `notifications_1781309249490`: Historial de alertas enviadas al usuario.

2. Security
  - RLS habilitado en ambas tablas.
  - Políticas para que los usuarios solo gestionen sus propias notificaciones.

3. Cron Logic (Reference)
  - Se definen las estructuras para que la Edge Function sea activada por pg_cron.
*/

-- Reminder Settings
CREATE TABLE IF NOT EXISTS reminder_settings_1781309249490 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses_1781308891343(id) ON DELETE CASCADE NOT NULL,
  enabled boolean DEFAULT true,
  reminder_hour time DEFAULT '09:00',
  notify_via_email boolean DEFAULT true,
  notify_via_app boolean DEFAULT true,
  days_to_remind int DEFAULT 1, -- Cuántos días antes recordar
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id)
);

ALTER TABLE reminder_settings_1781309249490 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own settings" ON reminder_settings_1781309249490
  USING (EXISTS (
    SELECT 1 FROM businesses_1781308891343 
    WHERE id = reminder_settings_1781309249490.business_id AND user_id = auth.uid()
  ));

-- Notifications History
CREATE TABLE IF NOT EXISTS notifications_1781309249490 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles_1781308891343(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES posts_1781308891343(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'REMINDER', -- REMINDER, SYSTEM, PAYMENT
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications_1781309249490 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notifications" ON notifications_1781309249490
  USING (auth.uid() = user_id);

-- Index for performance on unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications_1781309249490(user_id) WHERE read = false;