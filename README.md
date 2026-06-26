# Morvedre Core

PWA propia del Club Waterpolo Morvedre (Puerto de Sagunto, Valencia). Centraliza gestión deportiva, comunicación interna, logística de partidos y tesorería del club — sin comisiones, sin dependencia de plataformas externas, con el objetivo de coste 0.

## Estado

Fase 0 — Cimientos. En desarrollo.

## Quick start

```bash
pnpm install
cp .env.example .env.local
pnpm db:start
pnpm bootstrap
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Descripción |
|--------|-------------|
| `pnpm dev` | Servidor de desarrollo Next.js |
| `pnpm build` | Build de producción |
| `pnpm start` | Servidor de producción |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript sin emitir |
| `pnpm test` | Vitest en modo watch |
| `pnpm test:run` | Vitest en modo CI (sin watch) |
| `pnpm test:e2e` | Playwright E2E |
| `pnpm format` | Prettier write |
| `pnpm format:check` | Prettier check |
| `pnpm db:start` | Arranca Supabase local |
| `pnpm db:stop` | Detiene Supabase local |
| `pnpm db:reset` | Reset + migraciones + seeds |
| `pnpm db:push` | Aplica migraciones pendientes |
| `pnpm db:diff` | Genera migración desde el diff actual |
| `pnpm bootstrap` | Crea el primer admin en la base local |
| `pnpm icons:generate` | Genera los iconos PWA desde el logo |
| `pnpm icons:favicon` | Genera el favicon |

## Estructura

```
app/                    Rutas (App Router)
  (app)/                Rutas autenticadas (dashboard, profile…)
  (marketing)/          Rutas públicas (login, reset-password…)
components/             Componentes UI
  brand/                Identidad visual (logo, sello)
  layout/               Layouts y shells
  ui/                   Componentes primitivos (shadcn/ui)
lib/
  domain/               Lógica de negocio pura (funciones testables)
  supabase/             Clientes Supabase (client, server, middleware)
  utils/                Utilidades (cn, helpers)
server/                 Server Actions
scripts/                Scripts Node (bootstrap, generación de iconos)
supabase/
  migrations/           Migraciones SQL
tests/
  unit/                 Tests unitarios (Vitest)
  e2e/                  Tests end-to-end (Playwright)
docs/                   Planificación y decisiones
public/                 Assets estáticos (logo, iconos PWA)
```

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack/webpack)
- **React 19**
- **TypeScript** strict
- **Supabase** (Postgres + Auth + RLS)
- **Tailwind CSS 4**
- **shadcn/ui**
- **React Hook Form + Zod**
- **TanStack Table**
- **Serwist** (PWA / service worker)
- **Resend** (emails transaccionales)
- **Vitest** (unit) + **Testing Library** + **Playwright** (E2E)
