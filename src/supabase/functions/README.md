# Integración Mercado Pago — Edge Functions

Cobros de Ideastik: **suscripción mensual** (preapproval) + **compra de créditos**
(Checkout Pro). El Access Token es secreto y vive solo en el servidor; la
activación del plan/créditos la confirma siempre el webhook firmado.

## Funciones

| Función | Auth | Qué hace |
|---|---|---|
| `crear-suscripcion` | JWT usuario | Crea el preapproval mensual y devuelve `init_point`. |
| `crear-preferencia` | JWT usuario | Crea la preference de Checkout Pro para un pack de créditos. |
| `cancelar-suscripcion` | JWT usuario | Cancela el preapproval y baja el plan a FREE. |
| `mp-webhook` | **sin JWT** | Recibe notificaciones de MP, valida firma, activa plan / acredita créditos. |

`_shared/` contiene CORS, config de precios, el cliente de la API de MP (con
validación de firma HMAC) y los clientes de Supabase.

## 1. Migración

Aplica `src/supabase/migrations/1781340000000-mercadopago_schema.sql` (agrega
columnas de plan a `profiles` y crea `payments` + `webhook_logs`).

## 2. Secretos (nunca en variables `VITE_*`)

```bash
supabase secrets set MP_ACCESS_TOKEN="APP_USR-..."      # Access Token de tu app MP
supabase secrets set MP_WEBHOOK_SECRET="..."            # "Secreto de la firma" del webhook
supabase secrets set MP_CURRENCY="ARS"                  # ARS | CLP | MXN | COP | BRL | PEN | UYU
supabase secrets set APP_URL="https://ideastik.netlify.app"
# Precios opcionales (si no, usa los defaults de config.ts):
# supabase secrets set MP_PLAN_PRICE="9900"
# supabase secrets set MP_PACK_10_PRICE="4900"
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta
Supabase automáticamente.

## 3. Deploy

```bash
supabase functions deploy crear-suscripcion
supabase functions deploy crear-preferencia
supabase functions deploy cancelar-suscripcion
# El webhook NO lleva JWT de Supabase (lo llama Mercado Pago):
supabase functions deploy mp-webhook --no-verify-jwt
```

## 4. Configurar el webhook en Mercado Pago

En el panel de MP → tu aplicación → **Webhooks**, registra la URL:

```
https://<TU-PROYECTO>.supabase.co/functions/v1/mp-webhook
```

Suscríbete a los eventos **Pagos** y **Suscripciones (preapproval)**. Copia el
**Secreto de la firma** que genera MP y guárdalo como `MP_WEBHOOK_SECRET`.

## 5. Pruebas

Usa credenciales y **usuarios de prueba** de TEST (el MCP Server de Mercado Pago
te los crea y les carga fondos). Verifica en la tabla `webhook_logs` que las
notificaciones llegan con `signature_valid = true`, y en `payments` que cada
pago se registra una sola vez (idempotencia por `mp_payment_id`).

Cuando todo funcione, repite el deploy con credenciales de **producción**.
