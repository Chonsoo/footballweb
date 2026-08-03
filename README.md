# Quiniela de amigos
 
Web para apostar en Liga y Champions con el grupo: apuestas iniciales de temporada, apuestas por jornada, ranking de puntos y panel de admin.

Stack: Vite + React + TypeScript + Tailwind v4 + Supabase (Auth + Postgres + RLS), desplegado en Vercel.

## 1. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor** y pega el contenido de `supabase/schema.sql` → Run. Esto crea las tablas, RLS y funciones.
3. **Authentication → Providers → Email**: déjalo activado (login por email/contraseña).
4. **Authentication → Providers → Google**:
   - En [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crea credenciales OAuth "Aplicación web".
   - En **Authorized JavaScript origins** añade tu dominio (y `http://localhost:5173` en desarrollo).
   - En **Authorized redirect URIs** añade la callback URL que te da Supabase en esta misma pantalla (algo como `https://<tu-proyecto>.supabase.co/auth/v1/callback`).
   - Copia Client ID y Client Secret a la pantalla de Google en Supabase y guarda.
5. **Authentication → URL Configuration**: pon como Site URL tu dominio de producción (o `http://localhost:5173` mientras desarrollas) y añade también la otra en "Redirect URLs".
6. Copia **Project URL** y **anon public key** (Settings → API) — los necesitas para el `.env`.

### Convertirte en el primer admin

Regístrate una vez en la app y luego ejecuta en el SQL Editor (sustituye el email):

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'tu_email@ejemplo.com');
```

Desde ahí, como admin, puedes ascender/degradar a los demás desde el panel `/admin` sin volver a tocar SQL.

## 2. Desarrollo local

```bash
cp .env.example .env
# rellena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY

npm install
npm run dev
```

No hace falta ningún token de Vercel para esto — `.env` con la URL y la anon key de Supabase es suficiente (la anon key está pensada para ir en el cliente; la seguridad real la da la Row Level Security del schema).

Si prefieres `vercel dev` en vez de `vite dev` (para probar rutas/serverless igual que en producción): `vercel login` (una vez), `vercel link` para asociar la carpeta a tu proyecto de Vercel, y opcionalmente `vercel env pull` para traer las env vars que hayas guardado en el dashboard de Vercel a un `.env.local` local. Tampoco requiere un token manual salvo que automatices despliegues desde CI (ahí sí generarías un Vercel Access Token en Account Settings → Tokens).

## 3. Desplegar en Vercel

1. Importa el repo de GitHub en [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Vite** (autodetectado).
3. En **Environment Variables** añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (mismos valores que tu `.env`).
4. Deploy. Cada push a `main` desplegará a producción; cada rama/PR genera un preview.
5. Actualiza en Supabase (**Authentication → URL Configuration**) la Site URL / Redirect URLs con el dominio final de Vercel, y añade ese dominio a los "Authorized JavaScript origins" de Google si usas login con Google.

## Estructura

- `supabase/schema.sql` — tablas, RLS y funciones (aplícalo en Supabase).
- `src/lib/supabase.ts` — cliente de Supabase.
- `src/context/AuthContext.tsx` — sesión y perfil del usuario logueado.
- `src/pages/` — Login, Signup, Ranking, SeasonBets (apuestas iniciales), Matchdays/MatchdayDetail (jornadas), Admin.
- `src/components/` — Layout, Navbar, rutas protegidas (`ProtectedRoute`, `AdminRoute`).

## Notas

- Las apuestas iniciales (`season_questions`) y las jornadas/partidos se gestionan desde `/admin` — no hace falta tocar código para añadir o cambiar preguntas, ya que todo es dinámico desde la base de datos.
- Las respuestas/apuestas de los demás se ocultan hasta que pasa el `closes_at` / `deadline` correspondiente (controlado por RLS, no solo en el frontend).
