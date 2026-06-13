# Ideastik

Asistente conversacional que convierte una charla con un emprendedor en una estrategia de contenido completa: propuesta de valor, narrativa, pilares, estrategia y parrilla de publicaciones.

## Stack
- React + Vite + Tailwind CSS
- Supabase (Postgres + Auth + Edge Functions)
- Framer Motion

## Configuración local
1. Instala dependencias: `npm install`
2. Copia `.env.example` a `.env` y completa con tus claves de Supabase.
3. Arranca en desarrollo: `npm run dev`

## Variables de entorno
- `VITE_SUPABASE_URL` — URL del proyecto Supabase
- `VITE_SUPABASE_ANON_KEY` — clave pública (anon) de Supabase

## Estructura
- `src/pages/ChatWizard.jsx` — el wizard conversacional (pantalla principal)
- `src/lib/ia.js` — llamadas a la Edge Function de IA
- `src/lib/wizardMachine.js` — máquina de estados y prompts del wizard
- `src/pages/Calendar.jsx` — vista de calendario/parrilla
- `src/components/` — componentes (Layout, WizardAgent, UI)

## Despliegue
Conecta el repositorio a Netlify. Configura las variables de entorno en el panel de Netlify (Site settings > Environment variables).
