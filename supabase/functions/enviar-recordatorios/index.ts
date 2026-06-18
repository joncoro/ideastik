import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Variables de entorno (configúralas como secretos en Supabase para activar):
//  - EMAILIT_API_KEY  (obligatoria; si falta, la función queda inerte)
//  - CRON_SECRET      (obligatoria cuando hay API key; protege el endpoint)
//  - EMAILIT_FROM     (opcional, por defecto 'Ideastik <recordatorios@ideastik.com>')
//  - APP_URL          (opcional, por defecto 'https://ideastik.netlify.app')
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EMAILIT_API_KEY = Deno.env.get("EMAILIT_API_KEY") || "";
const EMAILIT_FROM = Deno.env.get("EMAILIT_FROM") || "Ideastik <recordatorios@ideastik.com>";
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
const APP_URL = Deno.env.get("APP_URL") || "https://ideastik.netlify.app";

const sb = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

function fechaCorta(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", timeZone: "America/Bogota" }).format(new Date(iso));
  } catch {
    return "";
  }
}

function plantilla(nombre: string, gancho: string, fecha: string, url: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1f1f1f">
    <div style="background:linear-gradient(135deg,#6C3DF4,#EC4899);padding:20px 24px;border-radius:16px 16px 0 0">
      <span style="color:#fff;font-weight:bold;font-size:18px">ideastik</span>
    </div>
    <div style="border:1px solid #eee;border-top:none;border-radius:0 0 16px 16px;padding:24px">
      <p style="font-size:13px;color:#888;margin:0 0 4px;text-transform:uppercase;letter-spacing:.5px">Recordatorio &middot; ${nombre}</p>
      <h2 style="font-size:19px;margin:0 0 12px">Tienes una publicación programada</h2>
      <p style="font-size:15px;line-height:1.5;margin:0 0 16px">${gancho}</p>
      <p style="font-size:13px;color:#888;margin:0 0 20px">Fecha: ${fecha}</p>
      <a href="${url}" style="display:inline-block;background:#6C3DF4;color:#fff;text-decoration:none;padding:11px 20px;border-radius:999px;font-weight:bold;font-size:14px">Abrir mi publicación</a>
      <p style="font-size:12px;color:#aaa;margin:24px 0 0">Puedes ajustar o desactivar estos recordatorios en Ajustes &rarr; Recordatorios.</p>
    </div>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // Inerte hasta configurar la API key de Emailit
  if (!EMAILIT_API_KEY) {
    return new Response(JSON.stringify({ skipped: true, reason: "EMAILIT_API_KEY no configurada (función inactiva)" }), { headers: { "Content-Type": "application/json" } });
  }
  // Con API key, exige el secreto compartido
  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "no autorizado" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const r = await sb("rpc/recordatorios_email_pendientes", { method: "POST", body: "{}" });
  if (!r.ok) {
    const detail = await r.text();
    return new Response(JSON.stringify({ error: "rpc", detail: detail.slice(0, 300) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const pendientes = await r.json();
  let enviados = 0;
  const errores: unknown[] = [];

  for (const it of pendientes) {
    const fecha = fechaCorta(it.fecha);
    const url = `${APP_URL}/#/n/${it.business_id}/post/${it.post_id}`;
    const asunto = `Recuerda publicar${it.pilar ? ` · ${it.pilar}` : ""}: ${it.gancho}`.slice(0, 120);
    try {
      const res = await fetch("https://api.emailit.com/v2/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${EMAILIT_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: EMAILIT_FROM,
          to: it.email,
          subject: asunto,
          html: plantilla(it.nombre_negocio || "tu negocio", it.gancho, fecha, url),
          text: `Recuerda publicar (${fecha}): ${it.gancho}. Ábrelo en ${url}`,
        }),
      });
      if (res.ok) {
        await sb("reminder_emails", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify({ post_id: it.post_id }) });
        enviados++;
      } else {
        errores.push({ post_id: it.post_id, status: res.status, body: (await res.text()).slice(0, 200) });
      }
    } catch (e) {
      errores.push({ post_id: it.post_id, error: String(e) });
    }
  }

  return new Response(JSON.stringify({ enviados, errores, total: pendientes.length }), { headers: { "Content-Type": "application/json" } });
});
