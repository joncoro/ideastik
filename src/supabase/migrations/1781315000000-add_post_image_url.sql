/* 
# Añadir soporte para imágenes IA 
1. Cambios en Tablas
  - `posts_1781308891343`: Añadir columna `image_url` para guardar las creaciones de la IA.
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts_1781308891343' AND column_name = 'image_url'
  ) THEN 
    ALTER TABLE posts_1781308891343 ADD COLUMN image_url text;
  END IF;
END $$;