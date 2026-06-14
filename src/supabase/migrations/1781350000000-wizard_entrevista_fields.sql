/*
# Entrevista dinámica del wizard — campos nuevos

La fase de descubrimiento ahora es una entrevista conducida por la IA que
recopila más contexto del negocio. Estos dos campos no existían:

- `objetivo`: objetivo de negocio (vender más, posicionarse, fidelizar...).
- `tono_marca`: tono de marca deseado por el emprendedor.

`cliente_ideal` y `horas_semana` ya existen (text). Aditivo e idempotente.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='objetivo') THEN
    ALTER TABLE public.businesses ADD COLUMN objetivo text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='tono_marca') THEN
    ALTER TABLE public.businesses ADD COLUMN tono_marca text;
  END IF;
END $$;
