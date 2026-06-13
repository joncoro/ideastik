/* 
# SCRIPT DE MIGRACIÓN INTEGRAL - IDEASTIK
Este script prepara la base de datos para la versión estable del software.

1. Creación de Tablas (IF NOT EXISTS)
2. Configuración de Seguridad (RLS)
3. Automatización de Perfiles (Trigger Auth)
4. Migración de datos desde tablas con sufijo
*/

-- ==========================================
-- 1. CREACIÓN DE TABLAS DEFINITIVAS
-- ==========================================

-- Tabla de Perfiles (Extensión de Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text,
  plan text DEFAULT 'FREE',
  credits int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Tabla de Negocios
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  nombre text NOT NULL,
  sector text,
  ciudad text,
  que_hace text,
  diferente text,
  horas_semana text,
  wizard_step int DEFAULT 0,
  current_fase text DEFAULT 'DATOS_NOMBRE',
  pv_opciones jsonb,
  narrativa jsonb,
  pilares jsonb,
  estrategia jsonb,
  ideas jsonb,
  created_at timestamptz DEFAULT now()
);

-- Tabla de Grids (Parrillas Mensuales)
CREATE TABLE IF NOT EXISTS public.grids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  mes int NOT NULL,
  anio int NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, mes, anio)
);

-- Tabla de Posts (Publicaciones)
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grid_id uuid REFERENCES public.grids(id) ON DELETE CASCADE NOT NULL,
  fecha timestamptz NOT NULL,
  pilar text,
  pilar_tipo text,
  formato text,
  canal text,
  gancho text,
  copy text,
  cta text,
  hashtags text[],
  hora text,
  status text DEFAULT 'DRAFT',
  image_url text,
  credit_charged boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Tabla de Mensajes del Wizard (Chat Historial)
CREATE TABLE IF NOT EXISTS public.wizard_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL, -- 'agent' | 'user'
  content text NOT NULL,
  widget jsonb,
  created_at timestamptz DEFAULT now()
);

-- Tabla de Notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'REMINDER',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 2. SEGURIDAD (RLS)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wizard_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso por usuario
DO $$ 
BEGIN
    -- Profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'User can view own profile') THEN
        CREATE POLICY "User can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
        CREATE POLICY "User can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    END IF;

    -- Businesses
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'User can manage own businesses') THEN
        CREATE POLICY "User can manage own businesses" ON public.businesses USING (auth.uid() = user_id);
    END IF;

    -- Grids
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'User can manage own grids') THEN
        CREATE POLICY "User can manage own grids" ON public.grids USING (
            EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = grids.business_id AND b.user_id = auth.uid())
        );
    END IF;

    -- Posts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'User can manage own posts') THEN
        CREATE POLICY "User can manage own posts" ON public.posts USING (
            EXISTS (SELECT 1 FROM public.grids g JOIN public.businesses b ON g.business_id = b.id WHERE g.id = posts.grid_id AND b.user_id = auth.uid())
        );
    END IF;

    -- Wizard Messages
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'User can manage own messages') THEN
        CREATE POLICY "User can manage own messages" ON public.wizard_messages USING (
            EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = wizard_messages.business_id AND b.user_id = auth.uid())
        );
    END IF;

    -- Notifications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'User can manage own notifications') THEN
        CREATE POLICY "User can manage own notifications" ON public.notifications USING (auth.uid() = user_id);
    END IF;
END $$;

-- ==========================================
-- 3. AUTOMATIZACIÓN (TRIGGERS)
-- ==========================================

-- Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Usuario Ideastik')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger de creación
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 4. MIGRACIÓN DE DATOS (TABLAS VIEJAS -> NUEVAS)
-- ==========================================

DO $$
BEGIN
  -- Migrar Profiles
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'profiles_1781308891343') THEN
    INSERT INTO public.profiles (id, email, name, plan, credits, created_at)
    SELECT id, email, name, plan, credits, created_at FROM public.profiles_1781308891343
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Migrar Businesses
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'businesses_1781308891343') THEN
    INSERT INTO public.businesses (id, user_id, nombre, sector, ciudad, que_hace, diferente, wizard_step, created_at)
    SELECT id, user_id, nombre, sector, ciudad, que_hace, diferente, wizard_step, created_at 
    FROM public.businesses_1781308891343
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Migrar Grids
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'grids_1781308891343') THEN
    INSERT INTO public.grids (id, business_id, mes, anio, created_at)
    SELECT id, business_id, mes, anio, created_at FROM public.grids_1781308891343
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Migrar Posts
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'posts_1781308891343') THEN
    INSERT INTO public.posts (id, grid_id, fecha, pilar, pilar_tipo, formato, canal, gancho, copy, cta, hashtags, status, image_url, created_at)
    SELECT id, grid_id, fecha, pilar, pilar_tipo, formato, canal, gancho, copy, cta, hashtags, status, image_url, created_at 
    FROM public.posts_1781308891343
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Migrar Notificaciones
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'notifications_1781309249490') THEN
    INSERT INTO public.notifications (id, user_id, post_id, title, message, type, read, created_at)
    SELECT id, user_id, post_id, title, message, type, read, created_at FROM public.notifications_1781309249490
    ON CONFLICT (id) DO NOTHING;
  END IF;

END $$;