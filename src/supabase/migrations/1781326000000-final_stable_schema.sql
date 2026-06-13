/* 
# Esquema Final Estable Ideastik
1. Nuevas Tablas
  - `profiles`: Datos de usuario, plan y créditos.
  - `businesses`: Configuración de marcas/negocios.
  - `grids`: Agrupadores mensuales.
  - `posts`: Contenido individual.
  - `notifications`: Alertas y recordatorios.
  - `wizard_messages`: Historial del ChatWizard.
2. Automatización
  - Trigger `on_auth_user_created`: Crea perfil automáticamente al registrarse.
  - Trigger `on_profile_deleted`: Elimina usuario de Auth al borrar perfil (Borrado total).
3. Migración
  - Copia datos de tablas con sufijo `_1781308891343` y `_1781309249490` a las nuevas.
*/

-- 1. TABLA: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text,
  plan text DEFAULT 'FREE',
  credits int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- 2. TABLA: businesses
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

-- 3. TABLA: grids
CREATE TABLE IF NOT EXISTS public.grids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  mes int NOT NULL,
  anio int NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, mes, anio)
);

-- 4. TABLA: posts
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

-- 5. TABLA: wizard_messages
CREATE TABLE IF NOT EXISTS public.wizard_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  widget jsonb,
  created_at timestamptz DEFAULT now()
);

-- 6. TABLA: notifications
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

-- SEGURIDAD: RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wizard_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS
CREATE POLICY "Users can manage own profile" ON public.profiles USING (auth.uid() = id);
CREATE POLICY "Users can manage own businesses" ON public.businesses USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own grids" ON public.grids USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = grids.business_id AND b.user_id = auth.uid()));
CREATE POLICY "Users can manage own posts" ON public.posts USING (EXISTS (SELECT 1 FROM public.grids g JOIN public.businesses b ON g.business_id = b.id WHERE g.id = posts.grid_id AND b.user_id = auth.uid()));
CREATE POLICY "Users can manage own messages" ON public.wizard_messages USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = wizard_messages.business_id AND b.user_id = auth.uid()));
CREATE POLICY "Users can manage own notifications" ON public.notifications USING (auth.uid() = user_id);

-- AUTOMATIZACIÓN: Trigger Creación Perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- AUTOMATIZACIÓN: Trigger Eliminación Auth
CREATE OR REPLACE FUNCTION public.handle_account_deletion()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;
CREATE TRIGGER on_profile_deleted
  AFTER DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_account_deletion();

-- MIGRACIÓN DE DATOS (Si existen tablas viejas)
DO $$
BEGIN
  -- Migrar Profiles
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'profiles_1781308891343') THEN
    INSERT INTO public.profiles SELECT * FROM public.profiles_1781308891343 ON CONFLICT (id) DO NOTHING;
  END IF;
  
  -- Migrar Businesses
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'businesses_1781308891343') THEN
    INSERT INTO public.businesses (id, user_id, nombre, sector, ciudad, que_hace, diferente, created_at)
    SELECT id, user_id, nombre, sector, ciudad, que_hace, diferente, created_at FROM public.businesses_1781308891343 ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Migrar Grids
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'grids_1781308891343') THEN
    INSERT INTO public.grids SELECT * FROM public.grids_1781308891343 ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Migrar Posts
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'posts_1781308891343') THEN
    INSERT INTO public.posts (id, grid_id, fecha, pilar, pilar_tipo, formato, canal, gancho, copy, cta, hashtags, status, created_at)
    SELECT id, grid_id, fecha, pilar, pilar_tipo, formato, canal, gancho, copy, cta, hashtags, status, created_at FROM public.posts_1781308891343 ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;