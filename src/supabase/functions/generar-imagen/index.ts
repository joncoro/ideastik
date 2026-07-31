// Generación y retoque de imágenes con OpenAI (gpt-image-1).
// - mode 'generate': crea el arte del post desde un prompt de texto.
// - mode 'edit': retoca/mejora la foto real que sube el usuario (base64).
// Requiere el secreto OPENAI_API_KEY en el proyecto de Supabase.
// El navegador NUNCA ve la key: solo llama a esta función.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { mode = "generate", prompt, image, size = "1024x1024" } = await req.json();
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return json({ error: "Falta configurar OPENAI_API_KEY en Supabase." }, 500);
    if (!prompt || typeof prompt !== "string") return json({ error: "Falta el prompt." }, 400);

    let resp: Response;
    if (mode === "edit" && image) {
      // La foto llega en base64 (sin el encabezado data:). La reconstruimos.
      const bytes = Uint8Array.from(atob(image), (c) => c.charCodeAt(0));
      const form = new FormData();
      form.append("model", "gpt-image-1");
      form.append("prompt", prompt);
      form.append("size", size);
      form.append("image", new File([bytes], "foto.jpg", { type: "image/jpeg" }));
      resp = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      });
    } else {
      resp = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-image-1", prompt, size, n: 1 }),
      });
    }

    const data = await resp.json();
    if (!resp.ok) {
      return json({ error: data?.error?.message || "El proveedor de imagen devolvió un error." }, resp.status);
    }
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return json({ error: "El proveedor no devolvió ninguna imagen." }, 502);
    return json({ b64 }, 200);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
