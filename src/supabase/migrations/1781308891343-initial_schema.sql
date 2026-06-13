/* 
# Esquema Inicial Ideastik
1. New Tables
  - `profiles_1781308891343`: Extensión de auth.users para datos de usuario y créditos.
  - `businesses_1781308891343`: Almacena la configuración de cada marca/negocio.
  - `grids_1781308891343`: Agrupador mensual de contenido por negocio.
  - `posts_1781308891343`: Publicaciones individuales con copy, tags y estado.

2. Security
  - RLS habilitado en todas las tablas.
  - Políticas para que los usuarios solo CRUD sobre sus propios datos.
*/

-- Profiles
CREATE TABLE IF NOT EXISTS profiles_1781308891343 (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text,
  plan text DEFAULT 'FREE',
  credits int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles_1781308891343 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles_1781308891343 FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles_1781308891343 FOR UPDATE USING (auth.uid() = id);

-- Businesses
CREATE TABLE IF NOT EXISTS businesses_1781308891343 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles_1781308891343(id) ON DELETE CASCADE NOT NULL,
  nombre text NOT NULL,
  sector text,
  ciudad text,
  que_hace text,
  diferente text,
  horas_semana int DEFAULT 3,
  wizard_step int DEFAULT 0,
  pv_opciones jsonb,
  narrativa jsonb,
  pilares jsonb,
  estrategia jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE businesses_1781308891343 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own businesses" ON businesses_1781308891343 
  USING (auth.uid() = user_id);

-- Grids
CREATE TABLE IF NOT EXISTS grids_1781308891343 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses_1781308891343(id) ON DELETE CASCADE NOT NULL,
  mes int NOT NULL,
  anio int NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, mes, anio)
);

ALTER TABLE grids_1781308891343 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own grids" ON grids_1781308891343 
  USING (EXISTS (
    SELECT 1 FROM businesses_1781308891343 
    WHERE id = grids_1781308891343.business_id AND user_id = auth.uid()
  ));

-- Posts
CREATE TABLE IF NOT EXISTS posts_1781308891343 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grid_id uuid REFERENCES grids_1781308891343(id) ON DELETE CASCADE NOT NULL,
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
  credit_charged boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE posts_1781308891343 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own posts" ON posts_1781308891343 
  USING (EXISTS (
    SELECT 1 FROM grids_1781308891343 g
    JOIN businesses_1781308891343 b ON g.business_id = b.id
    WHERE g.id = posts_1781308891343.grid_id AND b.user_id = auth.uid()
  ));