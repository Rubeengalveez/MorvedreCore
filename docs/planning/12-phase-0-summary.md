# Resumen de Fase 0 — Cimientos

> Estado al cierre: **completada**, commiteada y empujada al repo. Pendiente: ejecución real con credenciales Supabase del usuario.

## Logros

- **Scaffold completo del proyecto** Next.js 16 + TypeScript strict + Tailwind v4
- **Diseño system** con tokens del club: paleta (`#0A2E5C` profundo, `#FF6B35` acción, `#F4C430` balón) y tipografías (Manrope + Inter + JetBrains Mono)
- **Componentes UI** estilo shadcn: Button, Input, Label, Card, Alert, Form, Sheet
- **Layouts autenticados**: top bar con logo + notificaciones + selector de perfil, bottom nav con 4 destinos (Inicio, Calendario, Equipo, Yo)
- **Auth flow completo**: login, reset password, cambio obligatorio de contraseña en primer login, callback de Supabase
- **App shell + páginas**: dashboard con 3 empty states, perfil editable, placeholders para calendario y equipo
- **Supabase setup**: 3 clientes (browser, server, middleware), middleware Next.js, types generados
- **DB migration inicial**: 4 tablas (profiles, user_roles, parent_child_links, profile_notification_prefs) con 16 RLS policies y 2 helper functions
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
```

## Pendiente para Fase 1

1. **El usuario debe crear un proyecto real en Supabase Cloud** y rellenar `.env.local` con sus credenciales
2. **Ejecutar `pnpm db:push`** para aplicar la migración al proyecto real
3. **Ejecutar `pnpm bootstrap`** para crear el primer admin
4. **Configurar dominio en Vercel** cuando quiera desplegar
5. **Renombrar `middleware.ts` → `proxy.ts`** (deprecation de Next 16, no bloqueante)

## Archivos clave para entender la Fase 0

- `docs/planning/10-design-direction.md` — la dirección visual aplicada
- `docs/planning/00-decisions-log.md` — todas las decisiones tomadas
- `supabase/migrations/0001_init.sql` — el schema inicial con RLS
- `scripts/bootstrap-admin.mjs` — cómo crear el primer admin
- `app/(app)/layout.tsx` — el shell autenticado
- `lib/supabase/server.ts` — cómo se accede a Supabase desde el server
- `.github/workflows/ci.yml` — qué se valida en cada PR

## Cómo arrancar el dev

```bash
cd "C:\Users\galvi\Documents\Morvedre core"
pnpm install
cp .env.example .env.local  # editar con tus credenciales Supabase
pnpm db:start               # o usar Cloud
pnpm bootstrap              # crea el primer admin
pnpm dev                    # http://localhost:3000
```

## Ramas

- `main` — siempre deployable, contiene el código validado
- `feature/fase-0-scaffold` — rama de trabajo de esta fase (mergeada a main)
- Próximas features deberían ir en `feature/<nombre-descriptivo>`
