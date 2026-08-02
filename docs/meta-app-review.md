# Meta App Review — Ideastik (Instagram publishing)

Guía para configurar la app de Meta, verificar la conexión y enviar el App Review
de los permisos `instagram_business_basic` e `instagram_business_content_publish`.

> Todo lo técnico (Edge Functions, OAuth, publicación) ya está desplegado. Lo que falta
> es **configuración en Meta/Supabase** y el **envío del review**, que solo tú puedes hacer.

---

## 0. Datos de referencia

| Dato | Valor |
| --- | --- |
| App de Instagram (client_id) | `3317141398468537` (o el App ID de tu app de Meta) |
| Redirect URI (OAuth) | `https://qwtespedmdgisjuoiwji.supabase.co/functions/v1/instagram-oauth` |
| Web pública | `https://ideastik.netlify.app` |
| Política de Privacidad | `https://ideastik.netlify.app/privacidad` |
| Eliminación de datos | `https://ideastik.netlify.app/eliminacion-datos` |
| Permisos a revisar | `instagram_business_basic`, `instagram_business_content_publish` |

---

## 1. Configuración en Meta (App Dashboard)

En <https://developers.facebook.com/apps> → tu app → producto **Instagram** → **API setup with Instagram Business Login**:

1. **Business Login settings → OAuth redirect URIs:** añade exactamente
   `https://qwtespedmdgisjuoiwji.supabase.co/functions/v1/instagram-oauth`
   (sin barra final, sin espacios).
2. Anota el **Instagram App ID** y el **Instagram App Secret** (botón *Show*).
3. Si tu `client_id` real difiere de `3317141398468537`, define
   `VITE_INSTAGRAM_APP_ID` en Netlify (variables de entorno del sitio) con el valor correcto.

### Secretos en Supabase

En el proyecto `qwtespedmdgisjuoiwji` → **Edge Functions → Secrets**, define:

```
INSTAGRAM_APP_ID=<Instagram App ID>
INSTAGRAM_APP_SECRET=<Instagram App Secret>
APP_URL=https://ideastik.netlify.app
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` ya existen por defecto.
(Opcional, solo para pruebas con tu propia cuenta: `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`.)

---

## 2. Configuración en el App Dashboard (App Review requisitos)

En **App settings → Basic**:

- **Privacy Policy URL:** `https://ideastik.netlify.app/privacidad`
- **User Data Deletion:** elige *Data Deletion Instructions URL* →
  `https://ideastik.netlify.app/eliminacion-datos`
- **Category:** Business / Productivity.
- **App icon** (1024×1024) y datos de contacto.

---

## 3. Probar la conexión antes del review (modo desarrollo)

En modo desarrollo, solo funcionan las cuentas con **rol** en la app (admin, developer o tester).

1. En Meta → **App roles → Roles**, agrega tu cuenta de Instagram/Facebook como *Instagram Tester*
   y acéptalo desde la cuenta de Instagram (Configuración → Apps y sitios web → Invitaciones de tester).
2. La cuenta de Instagram debe ser **profesional** (Empresa o Creador).
3. En Ideastik: **Ajustes → Redes → Conectar Instagram** → autoriza. Debe volver con `?ig=ok`.
4. Verifica en Supabase que la fila de `social_accounts` tiene `status='conectada'`,
   `external_id` y `access_token`.
5. En el editor de una publicación con imagen guardada, usa **publicar directo** y confirma
   que aparece en el Instagram conectado.

Si algo falla, revisa los logs de la función `instagram-oauth` o `publicar-instagram` en Supabase.

---

## 4. Justificación de permisos (pegar en el App Review, en inglés)

### `instagram_business_basic`

> Ideastik is a content-planning tool for small businesses. After a user connects their
> professional Instagram account via Instagram Business Login, we use
> `instagram_business_basic` to read the account's username and ID. We display the connected
> username in the app's Settings → Networks screen so the user can confirm which account is
> linked, and we use the account ID as the target when publishing content the user has
> approved. We do not use this data for any other purpose.

### `instagram_business_content_publish`

> Ideastik lets users publish the image and caption they create inside the app directly to
> their own connected Instagram Business/Creator account. We use
> `instagram_business_content_publish` to create a media container and publish it to the
> user's account, only when the user explicitly taps "publish". We do not schedule, automate,
> or publish without an explicit user action.

---

## 5. Guion del screencast (obligatorio para el review)

Graba una pantalla mostrando el flujo completo, con una cuenta de prueba:

1. Inicia sesión en `https://ideastik.netlify.app` (muestra credenciales de prueba).
2. Ve a **Ajustes → Redes** y pulsa **Conectar Instagram**.
3. Muestra la pantalla de autorización de Instagram (Business Login) y acepta los permisos.
4. Regresa a Ideastik: la cuenta aparece como **Conectada**.
5. Abre una publicación con imagen y texto, pulsa **publicar directo a Instagram**.
6. Abre Instagram y muestra la publicación recién creada.
7. Vuelve a **Ajustes → Redes** y muestra **Desconectar** (eliminación del acceso).
8. Muestra brevemente las páginas `/privacidad` y `/eliminacion-datos`.

Sube el video en la sección de cada permiso al enviar el review.

---

## 6. Credenciales de prueba para el revisor

Meta necesita poder reproducir el flujo. En "App Review → Notes":

- Usuario de prueba de Ideastik: correo + contraseña de una cuenta ya creada.
- Aclara que **la cuenta de Instagram a conectar debe ser profesional** (Empresa/Creador).
  Si el revisor usará su propia cuenta, indícalo; si usará una tuya, agrégala como tester.

---

## 7. Checklist final antes de enviar

- [ ] Redirect URI registrado en Meta (idéntico al de la tabla).
- [ ] `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `APP_URL` en Supabase.
- [ ] Privacy Policy URL y Data Deletion Instructions URL guardadas en App settings.
- [ ] Conexión probada end-to-end con una cuenta tester (status `conectada`, publicación OK).
- [ ] Screencast grabado y subido por cada permiso.
- [ ] Justificaciones de la sección 4 pegadas en cada permiso.
- [ ] Notas con credenciales de prueba añadidas.
- [ ] Business verification completada (Meta puede exigirla para permisos avanzados).
- [ ] Enviar review y esperar respuesta de Meta.
