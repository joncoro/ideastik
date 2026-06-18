# enviar-recordatorios (Edge Function)

Envía por email los recordatorios de publicaciones próximas, usando Emailit.
Está DESPLEGADA en Supabase pero INACTIVA hasta configurar las variables de entorno.

## Qué hace
- Llama a `public.recordatorios_email_pendientes()` (respeta `reminder_settings`:
  enabled + notify_via_email + days_to_remind + reminder_hour, zona America/Bogota).
- Envía un correo por cada publicación pendiente vía Emailit (`POST https://api.emailit.com/v2/emails`).
- Anti-duplicados: registra cada envío en la tabla `reminder_emails`.

## Activación ("encender")
1. Verifica el dominio en Emailit (DNS de ideastik.com: SPF/DKIM/DMARC/MX bajo `emailit`).
2. En Supabase → Project Settings → Edge Functions → Secrets, agrega:
   - `EMAILIT_API_KEY`  = tu API key de Emailit (obligatoria)
   - `CRON_SECRET`      = una cadena aleatoria larga (obligatoria; protege el endpoint)
   - `EMAILIT_FROM`     = (opcional) `Ideastik <recordatorios@ideastik.com>`
   - `APP_URL`          = (opcional) `https://ideastik.netlify.app`
3. Programa el envío cada hora (corre el mismo CRON_SECRET que pusiste):
   ```sql
   create extension if not exists pg_net;
   select cron.schedule('ideastik-recordatorios-email', '0 * * * *', $$
     select net.http_post(
       url := 'https://qwtespedmdgisjuoiwji.supabase.co/functions/v1/enviar-recordatorios',
       headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','PON_AQUI_EL_CRON_SECRET'),
       body := '{}'::jsonb
     );
   $$);
   ```

Para apagar: `select cron.unschedule('ideastik-recordatorios-email');`
