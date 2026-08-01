/**
 * Cliente de generación/retoque de imágenes.
 * - Llama a la Edge Function `generar-imagen` (que guarda la key de OpenAI).
 * - Sube el resultado al bucket `post-images` de Storage y devuelve una URL
 *   pública, para no guardar base64 pesado en la base de datos.
 */
import supabase from '../supabase/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callImagen(payload) {
  const url = `${SUPABASE_URL.replace(/\/$/, '').trim()}/functions/v1/generar-imagen`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `No se pudo generar la imagen (${res.status}).`);
  if (!data?.b64) throw new Error('El proveedor no devolvió ninguna imagen.');
  return data.b64;
}

/** Genera el arte del post desde un prompt de texto. Devuelve base64. */
export const generarImagenPost = (prompt, size = '1024x1024') =>
  callImagen({ mode: 'generate', prompt, size });

/** Retoca/mejora una foto real (base64 sin encabezado). Devuelve base64. */
export const retocarImagen = (prompt, imageBase64, size = '1024x1024') =>
  callImagen({ mode: 'edit', prompt, image: imageBase64, size });

/** Sube un base64 al Storage y devuelve la URL pública para guardar en el post. */
export async function subirImagenPost(businessId, postId, b64) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const path = `${businessId}/${postId}-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('post-images')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('post-images').getPublicUrl(path);
  return data.publicUrl;
}
