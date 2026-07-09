# Resumen de Fase 0 — Cimientos

> Estado al cierre: **completada y operativa en cloud**. Commiteada, empujada y probada con Supabase real.

## Logros

- **Scaffold completo del proyecto** Next.js 16 + TypeScript strict + Tailwind v4
- **Diseño system** con tokens del club: paleta (`#0A2E5C` profundo, `#FF6B35` acción, `#F4C430` balón) y tipografías (Manrope + Inter + JetBrains Mono)
- **Componentes UI** estilo shadcn: Button, Input, Label, Card, Alert, Form, Sheet
- **Layouts autenticados**: top bar con logo + notificaciones + selector de perfil, bottom nav con 4 destinos (Inicio, Calendario, Equipo, Yo)
- **Auth flow completo**: login, reset password, cambio obligatorio de contraseña en primer login, callback de Supabase
- **App shell + páginas**: dashboard con 3 empty states, perfil editable, placeholders para calendario y equipo
- **Supabase setup**: 3 clientes (browser, server, middleware), middleware Next.js, types generados
- **DB migration inicial**: 4 tablas (profiles, user_roles, parent_child_links, profile_notification_prefs) con 16 RLS policies y 2 helper functions
- **Migración 0002 fix**: `user_roles.scope_team_id` nullable (admin no tiene equipo) + UNIQUE en lugar de PK
- **Bootstrap del primer admin**: script idempotente que crea `galvillo9@gmail.com` con `must_change_password = true`
- **PWA base**: Serwist service worker, manifest webmanifest, iconos 192/512/maskable optimizados con `sharp` desde el logo original
- **CI**: workflow de GitHub Actions con 4 jobs paralelos (lint, typecheck, build, test)
- **Tests**: Vitest configurado con 3 tests pasando + Playwright configurado con smoke test
- **Documentación**: README, AGENTS.md, decisiones, design direction

## Validación (todo OK)

```
lint:        0 errores, 0 warnings
typecheck:   0 errores
build:       11 rutas generadas, 0 errores
tests:       3/3 pasan
push:        feature/fase-0-scaffold + main
cloud:       Supabase Cloud OK, migraciones aplicadas, admin creado y autenticable
dev:         pnpm dev arranca y /dashboard redirige a /login (middleware OK)
```

## Estado en producción (cloud)

- **Proyecto Supabase**: `hzplkjtfejqfulhhnlya`
- **URL**: https://hzplkjtfejqfulhhnlya.supabase.co
- **Migraciones aplicadas**: 0001 (init) + 0002 (fix user_roles)
- **Usuario admin**:
  - email: `galvillo9@gmail.com`
  - password temporal: `MorvedreTemporal2026!`
  - rol: admin
  - `must_change_password: true`
- **Auth user id**: `0c6b0daf-b513-4ebf-89bc-9b7b0e9b58d7`
- **Profile id**: `b998a15b-aa0b-4d37-af7d-bc32aef751a3`

## Cómo arrancar el dev

```bash
cd "C:\Users\galvi\Documents\Morvedre core"
pnpm install
# .env.local ya existe con las credenciales reales
pnpm dev   # http://localhost:3000
```

Login con `galvillo9@gmail.com` y `MorvedreTemporal2026!`. La app te obliga a cambiar la contraseña en el primer login.

## Pendiente

1. **Renombrar `middleware.ts` → `proxy.ts`** (deprecation de Next 16, no bloqueante)
2. **Configurar dominio en Vercel** cuando quiera desplegar
3. **Optimizar el logo original** (2.2MB → versión optimizada)

## Archivos clave

- `docs/planning/10-design-direction.md` — la dirección visual aplicada
- `docs/planning/00-decisions-log.md` — todas las decisiones tomadas
- `supabase/migrations/0001_init.sql` — el schema inicial con RLS
- `supabase/migrations/0002_fix_user_roles_scope.sql` — fix del scope nullable
- `scripts/bootstrap-admin.mjs` — cómo crear el primer admin
- `app/(app)/layout.tsx` — el shell autenticado
- `lib/supabase/server.ts` — cómo se accede a Supabase desde el server
- `.github/workflows/ci.yml` — qué se valida en cada PR

## Ramas

- `main` — siempre deployable, contiene el código validado
- `feature/fase-0-scaffold` — rama de trabajo de esta fase (mergeada a main)
- Próximas features deberían ir en `feature/<nombre-descriptivo>`
