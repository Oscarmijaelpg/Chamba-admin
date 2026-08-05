# Conecta2 Admin — Guía para Claude

Panel de administración en **admin.conecta2.dev**. Vite + React (**JSX, no TS**) +
Tailwind + Supabase + TanStack Query. Repo propio: `Oscarmijaelpg/Chamba-admin`.
Deploy en Vercel.

> ⚠️ Este repo es **JavaScript/JSX**, no TypeScript. No agregar `.ts`/`.tsx`.
> Las reglas del CLAUDE.md de la app móvil (i18n, `makeStyles`, tokens) NO aplican.

---

## Estructura

```
src/
  App.jsx            ← rutas + layout
  components/        ← una vista por dominio (UsersTable, ChambasTable,
                       FinanceView, ActivityView, AuditLogsView, AlertsConfig…)
                       + modales de detalle (UserDetailModal, ChambaDetailModal…)
  hooks/             ← usePagedQuery y demás
  lib/               ← cliente supabase, helpers
```

## Reglas

- **Datos con React Query + paginación server-side** (`usePagedQuery` +
  `Pagination`). Nunca traer tablas enteras: `max_rows` del proyecto es 5000.
- **Las métricas van por RPCs** de analytics, no calculadas en el cliente.
- **Code-splitting** por vista (las tablas y charts son pesados).
- **Acciones sensibles pasan por RPCs admin** (`admin_reports_list`,
  `admin_resolve_report`, `admin_resolve_dispute`…), que validan `is_admin()`
  server-side. El cliente nunca escribe dinero ni estados directo.
- **Este panel consume el MISMO esquema que la app y la web.** Si se borra o
  renombra una columna en la base, hay que revisar acá también (pasó con
  `users.is_premium`).

## Comandos

```bash
npm run dev      # desarrollo
npm run build    # build (validar antes de pushear)
npm run lint     # eslint
npm test         # vitest
npm run test:e2e # playwright
```
