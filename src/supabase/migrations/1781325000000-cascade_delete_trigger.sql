/* 
# Trigger de Eliminación en Cascada
1. Objetivo
  - Asegurar que al eliminar un registro en `profiles`, se elimine automáticamente el usuario en `auth.users`.
  - Debido a que las tablas `businesses`, `grids`, `posts` y `wizard_messages` ya tienen `ON DELETE CASCADE` hacia el perfil o negocio, esto limpiará TODO el rastro del usuario.
2. Seguridad
  - El trigger utiliza `SECURITY DEFINER` para tener permisos de borrado en el esquema `auth`.
*/

CREATE OR REPLACE FUNCTION public.handle_account_deletion()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se activa DESPUÉS de borrar el perfil
DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;
CREATE TRIGGER on_profile_deleted
  AFTER DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_account_deletion();