// Publica una imagen en Instagram (Content Publishing API).
// Usa el token de la cuenta conectada por el usuario (social_accounts); si no hay,
// cae al token de secreto (INSTAGRAM_ACCESS_TOKEN/USER_ID) para pruebas.
// Flujo Meta: crear contenedor de media -> publicarlo.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
const GRAPH = "https://graph.instagram.com/v21.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { imageUrl, caption = "", businessId } = await req.json();
    if (!imageUrl) return json({ error: "Falta la URL de la imagen (genera o guarda el arte del post)." }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let token: string | null = null;
    let igUser: string | null = null;

    // Token por cuenta: valida que el negocio sea del usuario autenticado.
    if (businessId) {
      const authHeader = req.headers.get("Authorization") || "";
      const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const admin = createClient(SUPABASE_URL, SERVICE);
        const { data: biz } = await admin.from("businesses").select("id").eq("id", businessId).eq("user_id", user.id).maybeSingle();
        if (biz) {
          const { data: acc } = await admin.from("social_accounts")
            .select("access_token, external_id, status")
            .eq("business_id", businessId).eq("platform", "instagram").maybeSingle();
          if (acc && acc.status === "conectada" && acc.access_token && acc.external_id) {
            token = acc.access_token; igUser = String(acc.external_id);
          }
        }
      }
    }

    // Respaldo: token de secreto (prueba con la cuenta propia).
    if (!token || !igUser) {
      token = Deno.env.get("INSTAGRAM_ACCESS_TOKEN") || null;
      igUser = Deno.env.get("INSTAGRAM_USER_ID") || null;
    }
    if (!token || !igUser) return json({ error: "No hay una cuenta de Instagram conectada. Conéctala en Ajustes → Redes." }, 400);

    // 1) contenedor
    const createBody = new URLSearchParams({ image_url: imageUrl, caption, access_token: token });
    const createRes = await fetch(`${GRAPH}/${igUser}/media`, { method: "POST", body: createBody });
    const createData = await createRes.json();
    if (!createRes.ok || !createData.id) {
      console.error("IG create error:", JSON.stringify(createData));
      return json({ error: createData?.error?.message || "No se pudo crear la publicación en Instagram." }, 502);
    }

    // 2) publicar
    const pubBody = new URLSearchParams({ creation_id: createData.id, access_token: token });
    const pubRes = await fetch(`${GRAPH}/${igUser}/media_publish`, { method: "POST", body: pubBody });
    const pubData = await pubRes.json();
    if (!pubRes.ok || !pubData.id) {
      console.error("IG publish error:", JSON.stringify(pubData));
      return json({ error: pubData?.error?.message || "El contenedor se creó pero no se pudo publicar." }, 502);
    }

    return json({ ok: true, id: pubData.id });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
