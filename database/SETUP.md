# Base de datos — Notas para el Admin

> El esquema **no se gestiona desde este repo**. La base de datos vive en Supabase
> (proyecto `eavefhyizomclwmnaxcp`) y es creada/versionada por las migraciones del
> backend móvil en **`mobile/server/migrations/`**. El admin sólo **consume** esa
> base vía el cliente JS (`src/lib/supabase.js`).
>
> Las migraciones que antes vivían aquí (`001_init_schema.sql`, `002_jobs_external.sql`)
> describían un esquema genérico de scaffold (`profiles`, `sessions`, `notifications`,
> `users.role`, `jobs_external`…) que **nunca correspondió** a este proyecto, por lo
> que se eliminaron para evitar confusiones.

## Cómo se conecta el admin

- Cliente: `@supabase/supabase-js` con `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (ver `.env`).
- Autenticación: el admin inicia sesión como un usuario con `users.is_admin = true`.
- Autorización: las lecturas dependen de las **políticas RLS** definidas en Supabase.
  Los administradores leen las tablas restringidas vía políticas tipo `is_admin()` /
  `users.is_admin = true` (p. ej. `payments`, `scraper_runs`); otras tablas
  (`analytics_events`, `applications`) tienen lectura abierta a usuarios autenticados.

## Tablas que consume el admin

`users`, `chambas`, `jobs`, `applications`, `payments`, `wallet_transactions`,
`chamba_reports`, `audit_logs`, `analytics_events`, `scraper_runs`, `app_config`,
`pricing_config`, `notification_logs`.

Notas de esquema útiles (verificadas en producción):

- `users` usa `is_admin` (boolean) y `user_type` — **no** existe una columna `role`.
- Los empleos scrapeados están en **`jobs`** con `is_external = true` (no hay tabla
  `jobs_external`). "Oferta activa" = `is_external = true AND status = 'open'`.
- `payments.status`: `escrow | released | refunded | disputed`.
- `applications.status`: `pending | accepted | rejected | cancelled`.
- `analytics_events` tiene `timestamp` (lo setea la app móvil) y `created_at` (default);
  el admin filtra por `created_at`.

## Inspeccionar el esquema real

### Opción A — SQL Editor de Supabase
`https://app.supabase.com` → proyecto → **SQL Editor**. Ejemplos:

```sql
-- Tablas existentes
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Columnas de una tabla
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'jobs'
ORDER BY ordinal_position;

-- Políticas RLS de una tabla
SELECT policyname, cmd, qual FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'payments';
```

### Opción B — Management API (CLI)
```bash
curl -s -X POST \
  "https://api.supabase.com/v1/projects/eavefhyizomclwmnaxcp/database/query" \
  -H "Authorization: Bearer <PERSONAL_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT table_name FROM information_schema.tables WHERE table_schema=''public'' ORDER BY table_name;"}'
```

## Backup

Usar las herramientas de Supabase (Dashboard → Database → Backups) o la CLI:
`supabase db dump --project-ref eavefhyizomclwmnaxcp > backup.sql`.
