// Publica una imagen en Instagram (Content Publishing API, login de Instagram).
// Flujo en 2 pasos: crear contenedor de media -> publicarlo.
// Requiere secretos en Supabase:
//   INSTAGRAM_ACCESS_TOKEN  (token con permiso instagram_business_content_publish)
//   INSTAGRAM_USER_ID       (id de la cuenta de IG, ej. 17841440272581646)
// La imagen debe ser una URL pública (usamos el bucket post-images de Storage).

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const GRAPH = "https://graph.instagram.com/v21.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { imageUrl, caption = "" } = await req.json();
    const token = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
    const igUser = Deno.env.get("INSTAGRAM_USER_ID");
    if (!token || !igUser) return json({ error: "Faltan INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_USER_ID en Supabase." }, 500);
    if (!imageUrl) return json({ error: "Falta la URL de la imagen (genera o sube el arte del post)." }, 400);

    // 1) Crear el contenedor de media.
    const createBody = new URLSearchParams({ image_url: imageUrl, caption, access_token: token });
    const createRes = await fetch(`${GRAPH}/${igUser}/media`, { method: "POST", body: createBody });
    const createData = await createRes.json();
    if (!createRes.ok || !createData.id) {
      return json({ error: createData?.error?.message || "No se pudo crear la publicación en Instagram." }, 502);
    }

    // 2) Publicar el contenedor.
    const pubBody = new URLSearchParams({ creation_id: createData.id, access_token: token });
    const pubRes = await fetch(`${GRAPH}/${igUser}/media_publish`, { method: "POST", body: pubBody });
    const pubData = await pubRes.json();
    if (!pubRes.ok || !pubData.id) {
      return json({ error: pubData?.error?.message || "El contenedor se creó pero no se pudo publicar." }, 502);
    }

    return json({ ok: true, id: pubData.id });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
