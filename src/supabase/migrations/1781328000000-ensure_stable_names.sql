/* 
# Asegurar Nombres de Tablas Estables
1. Cambios
  - Renombra definitivamente cualquier tabla con sufijo que haya quedado pendiente.
  - Asegura que la tabla `reminder_settings` exista con la estructura correcta.
  - Actualiza las políticas de RLS para usar los nombres de tablas limpios.
*/

DO $$ 
BEGIN
    -- Asegurar reminder_settings
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'reminder_settings_1781309249490') THEN
        ALTER TABLE IF EXISTS reminder_settings_1781309249490 RENAME TO reminder_settings;
    END IF;

    -- Si por alguna razón no existe ninguna de las dos, crearla
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'reminder_settings') THEN
        CREATE TABLE public.reminder_settings (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
            enabled boolean DEFAULT true,
            reminder_hour time DEFAULT '09:00',
            notify_via_email boolean DEFAULT true,
            notify_via_app boolean DEFAULT true,
            days_to_remind int DEFAULT 1,
            updated_at timestamptz DEFAULT now(),
            UNIQUE(business_id)
        );
        ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can manage own settings" ON public.reminder_settings 
        USING (EXISTS (SELECT 1 FROM public.businesses WHERE id = reminder_settings.business_id AND user_id = auth.uid()));
    END IF;
END $$;