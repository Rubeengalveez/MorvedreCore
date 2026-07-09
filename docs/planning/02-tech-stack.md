# Stack técnico propuesto

Decisiones tomadas con el criterio de "coste cero + mantenibilidad baja + edad del proyecto ≥ 10 años".

## 1. Frontend

| Decisión    | Elección                                          | Por qué                                                                     |
| ----------- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| Framework   | **Next.js 15 (App Router)**                       | SSR, RSC, Server Actions, enrutado por archivos, desplegar en Vercel gratis |
| Lenguaje    | **TypeScript strict**                             | Evita errores en un club sin equipo técnico de guardia                      |
| Estilos     | **Tailwind CSS v4** + tokens en CSS               | Mobile-first nativo, sin pre-procesador                                     |
| Componentes | **shadcn/ui** (no librería, se copia al proyecto) | Accesible, modificable, sin dependencia viva                                |
| Iconos      | **lucide-react**                                  | Open source, mismo set mental, tree-shakeable                               |
| Formularios | **react-hook-form** + **zod**                     | Mínima re-render, validación tipada, mismos esquemas en cliente y servidor  |
| Tablas      | **@tanstack/react-table**                         | Headless, virtualizable, perfecto para rankings                             |
| Fechas      | **date-fns-tz** con `Europe/Madrid`               | Tamaño pequeño, inmutable, sin surprises                                    |
| Gráficos    | **recharts**                                      | Para evolución de stats (opcional)                                          |
| Animación   | Solo CSS y View Transitions nativas               | Evitar librería para 200 usuarios                                           |

## 2. PWA

| Decisión       | Elección                                                                       | Por qué                                                |
| -------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Service Worker | **Serwist** (sucesor de next-pwa)                                              | Mantenido activamente, integra con Next 15             |
| Push           | **web-push** con claves VAPID propias                                          | Sin Firebase, sin coste                                |
| Iconos         | Generados con **PWA Asset Generator** o con **RealFaviconGenerator**           | Tamaños correctos 192/512/maskable                     |
| Instalación    | Prompt "Add to Home Screen" custom                                             | Antes de que el navegador muestre el suyo              |
| Offline        | Solo lectura: calendario, rankings cacheados, acta offline de la última sesión | No permitimos escritura offline para evitar conflictos |

## 3. Backend / datos

| Decisión        | Elección                                                 | Por qué                                                               |
| --------------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| BBDD            | **Supabase Postgres**                                    | Plan free cubre 200 usuarios, RLS para seguridad, realtime para actas |
| Auth            | **Supabase Auth** (email + password)                     | Magic link opcional para reset, sin OAuth externo                     |
| Storage         | **Supabase Storage**                                     | Fotos de perfil y material de noticias (1GB free)                     |
| Lógica servidor | **Server Actions** de Next.js                            | Para mutaciones; API Routes solo para webhooks de Resend              |
| Realtime        | **Supabase Realtime**                                    | Para actas colaborativas y chat opcional                              |
| Cron jobs       | **Vercel Cron**                                          | Para cierres programados, recordatorios, caducidades                  |
| Email           | **Resend** + **React Email**                             | 100 emails/día gratis, plantillas tipadas                             |
| Excel           | **ExcelJS** (server) y **SheetJS** (cliente para import) | Genera el cierre mensual y parsea el alta masiva                      |

## 4. Calidad / DX

| Decisión   | Elección                                                     |
| ---------- | ------------------------------------------------------------ |
| Lint       | ESLint (config Next + reglas de seguridad)                   |
| Formato    | Prettier                                                     |
| Pre-commit | Husky + lint-staged                                          |
| Tests unit | Vitest                                                       |
| Tests e2e  | Playwright                                                   |
| Tipos      | TypeScript strict + `supabase gen types` para tipos de la DB |
| Git hooks  | commitlint (Conventional Commits)                            |

## 5. Despliegue

| Decisión   | Elección                                     | Por qué                                    |
| ---------- | -------------------------------------------- | ------------------------------------------ |
| Hosting    | Vercel                                       | Free tier generoso, CDN global, ISR gratis |
| BBDD       | Supabase Cloud                               | Plan free 500MB DB, 1GB storage, 50k MAU   |
| Dominio    | `morvedre-core.app` o el que decidas         | En Vercel (≈10€/año)                       |
| Backups    | Cron semanal que exporta dump a Storage      | Por si Supabase free se queda corto        |
| Monitoring | Vercel Analytics (gratis) + logs de Supabase | Suficiente para 200 usuarios               |

## 6. Estructura de carpetas

```
morvedre-core/
├── app/
│   ├── (marketing)/              # Páginas públicas (login, recuperación)
│   │   ├── login/
│   │   └── reset/
│   ├── (app)/                    # Rutas autenticadas
│   │   ├── dashboard/
│   │   ├── teams/
│   │   ├── trainings/
│   │   ├── matches/
│   │   ├── stats/
│   │   ├── shop/
│   │   ├── treasury/
│   │   ├── logistics/
│   │   ├── news/
│   │   ├── profile/
│   │   └── admin/
│   ├── api/
│   │   ├── webhooks/
│   │   └── cron/                 # Cierre de mes, recordatorios
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── layout/                   # Shell, sidebar móvil, header, profile-switcher
│   ├── dashboard/
│   ├── teams/
│   ├── matches/
│   ├── trainings/
│   ├── stats/
│   ├── shop/
│   ├── treasury/
│   ├── logistics/
│   ├── news/
│   └── profile/
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Cliente browser
│   │   ├── server.ts             # Cliente server (cookies)
│   │   └── middleware.ts         # Refresh de sesión
│   ├── auth/                     # Helpers de auth
│   ├── domain/                   # Reglas de negocio puras
│   │   ├── categories.ts         # Cálculo categoría desde año nacimiento
│   │   ├── callups.ts            # Matriz de ascensos, regla B
│   │   ├── rankings.ts           # Cálculo de rankings
│   │   ├── treasury.ts           # Generación de cierre
│   │   └── season.ts             # Transición de temporada
│   ├── excel/                    # Generación/parseo
│   ├── email/                    # Plantillas React Email
│   └── utils/
├── server/
│   ├── actions/                  # Server Actions por dominio
│   └── queries/                  # Funciones de lectura con caché
├── hooks/
├── types/                        # Tipos compartidos + Supabase
├── supabase/
│   ├── migrations/               # SQL versionado
│   ├── seed.sql                  # Datos iniciales (categorías, conceptos tarifa)
│   └── policies/                 # RLS por tabla
├── public/
│   ├── icons/                    # PWA icons
│   ├── manifest.json
│   └── logo.svg
├── tests/
│   ├── unit/
│   └── e2e/
├── docs/                         # Esta documentación
├── .github/                      # CI workflows (lint, test, build)
├── middleware.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── eslint.config.mjs
└── package.json
```

## 7. Fases de scaffolding (lo que haré al ejecutar)

1. `pnpm create next-app@latest morvedre-core --ts --app --tailwind --eslint`
2. Instalar: shadcn/ui, supabase-js, @supabase/ssr, zod, react-hook-form, @tanstack/react-table, date-fns, date-fns-tz, lucide-react, serwist, web-push, resend, react-email, exceljs
3. Configurar `lib/supabase/{client,server,middleware}.ts`
4. Crear `middleware.ts` para refresh de sesión
5. Configurar Serwist con manifest.json
6. Generar `globals.css` con tokens de marca (pendiente de 1.1–1.4)
7. Instalar shadcn/ui: button, card, input, dialog, sheet, tabs, toast, form, select, calendar, popover, table
8. Crear layouts: `(marketing)/layout.tsx` y `(app)/layout.tsx` con sidebar inferior en móvil
9. Configurar ESLint + Prettier + Husky
10. Inicializar Supabase local (`supabase init`) y primera migración con la tabla `profiles`
