// Callback OAuth de Instagram Business Login.
// Meta redirige aquí con ?code&state. Canjeamos el code por un token de larga
// duración (usando el App Secret, del lado del servidor), leemos el usuario de
// IG y guardamos todo en social_accounts para el negocio que inició la conexión.
// verify_jwt = false: Meta llama sin JWT; validamos con el `state` (nonce).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_ID = Deno.env.get("INSTAGRAM_APP_ID")!;
const APP_SECRET = Deno.env.get("INSTAGRAM_APP_SECRET")!;
const APP_URL = Deno.env.get("APP_URL") || "https://ideastik.netlify.app";
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/instagram-oauth`;

function redirect(to: string) {
  return new Response(null, { status: 302, headers: { Location: to } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error_description") || url.searchParams.get("error");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const back = (bizId: string | null, ok: boolean, msg = "") =>
    redirect(`${APP_URL}/#/n/${bizId || ""}/ajustes?ig=${ok ? "ok" : "error"}${msg ? `&msg=${encodeURIComponent(msg)}` : ""}`);

  try {
    if (err) return back(null, false, err);
    if (!code || !state) return back(null, false, "Faltan parámetros de autorización.");

    // Validar el state y obtener el negocio.
    const { data: st } = await admin.from("ig_oauth_states").select("business_id").eq("nonce", state).single();
    if (!st) return back(null, false, "Sesión de conexión inválida o vencida.");
    const businessId = st.business_id as string;
    await admin.from("ig_oauth_states").delete().eq("nonce", state);

    // 1) code -> token corto
    const shortForm = new URLSearchParams({
      client_id: APP_ID, client_secret: APP_SECRET,
      grant_type: "authorization_code", redirect_uri: REDIRECT_URI, code,
    });
    const shortRes = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: shortForm });
    const shortData = await shortRes.json();
    const shortToken = shortData.access_token || shortData?.data?.[0]?.access_token;
    if (!shortRes.ok || !shortToken) return back(businessId, false, shortData?.error_message || "No se pudo autorizar.");

    // 2) token corto -> token largo (~60 días)
    const longUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${APP_SECRET}&access_token=${shortToken}`;
    const longRes = await fetch(longUrl);
    const longData = await longRes.json();
    const longToken = longData.access_token || shortToken;

    // 3) datos de la cuenta
    const meRes = await fetch(`https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=${longToken}`);
    const me = await meRes.json();
    const igId = me.user_id || shortData.user_id || shortData?.data?.[0]?.user_id || null;
    const username = me.username || null;

    // 4) guardar la cuenta conectada
    const { error: upErr } = await admin.from("social_accounts").upsert({
      business_id: businessId, platform: "instagram", username,
      status: "conectada", external_id: igId ? String(igId) : null,
      access_token: longToken, connected_at: new Date().toISOString(),
    }, { onConflict: "business_id,platform" });
    if (upErr) return back(businessId, false, "No se pudo guardar la cuenta.");

    return back(businessId, true);
  } catch (e) {
    return back(null, false, String((e as Error)?.message || e));
  }
});
