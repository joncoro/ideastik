/**
 * Inicio del OAuth de Instagram Business Login.
 * Construye la URL de autorización y redirige. El App ID es público (aparece en
 * la URL); se puede sobreescribir con VITE_INSTAGRAM_APP_ID. El canje del código
 * y el guardado del token ocurren en la Edge Function `instagram-oauth`.
 */
import { db } from './db';

const APP_ID = import.meta.env.VITE_INSTAGRAM_APP_ID || '3317141398468537';
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '').trim();
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/instagram-oauth`;
const SCOPES = 'instagram_business_basic,instagram_business_content_publish';

/** Pide un nonce al backend, arma la URL de Instagram y redirige el navegador. */
export async function iniciarConexionInstagram(businessId) {
  const nonce = await db.crearIgOauthState(businessId);
  const url = new URL('https://www.instagram.com/oauth/authorize');
  url.searchParams.set('client_id', APP_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('state', nonce);
  window.location.href = url.toString();
}
