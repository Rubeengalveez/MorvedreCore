# Resumen de Fase 7 - Logistica de coches

> Estado: completada, migracion aplicada en Supabase y validada con tests/build.

## Logros

### Base de datos

- `20260709143201_travel_logistics.sql`
- Nuevas tablas:
  - `travel_offers`
  - `travel_reservations`
- Nuevos campos en `matches`:
  - `travel_meeting_point`
  - `travel_compensation_cents`
- RLS en todas las tablas nuevas.
- RPC `reserve_travel_seat(offer_id, player_id)` para reservar con bloqueo de fila y evitar sobreventa.
- Trigger de validacion para impedir reservas directas si la oferta esta llena, cancelada, no es visitante o la logistica no esta activa.
- Trigger de sincronizacion de plazas ocupadas.

### Dominio

- `lib/domain/travel.ts`
- `lib/domain/travel-schemas.ts`
- Maximo de 6 plazas por coche.
- Compensacion por defecto: 30 euros por coche.
- Validacion de salida antes del partido.
- Formato de compensacion.

### Server Actions

- `createTravelOffer`
- `reserveTravelSeat`
- `cancelTravelReservation`
- `cancelTravelOffer`
- `configureMatchTravel`

### Queries

- `getMatchTravel`
- Carga partido, equipo, ofertas, conductor y pasajeros.
- Determina si el perfil activo puede gestionar el desplazamiento.

### UI

- Nueva ruta `/matches/[id]/travel`.
- Acceso desde detalle de partido visitante con logistica activa.
- Vista mobile-first con:
  - punto de encuentro
  - compensacion
  - coches disponibles
  - pasajeros por coche
  - reserva/cancelacion
  - panel de gestion para staff

## Validacion

```
pnpm run test:run tests/unit/travel.test.ts
Test Files  1 passed
Tests       6 passed

pnpm run test:run
Test Files  23 passed
Tests       449 passed | 22 skipped

pnpm run build
Compiled successfully
```

## Supabase

- Migracion remota aplicada: `20260709143201_travel_logistics`.
- `supabase migration list --linked` muestra local y remoto alineados.
- `supabase db advisors --linked --type security` no devuelve avisos nuevos de la fase.
- Aviso pendiente ya conocido: leaked password protection disabled en Supabase Auth.

## Nota tecnica

`pnpm run typecheck` global sigue fallando por deuda previa fuera de esta fase, sobre todo `implicit any` en pantallas antiguas y resolucion local de `@supabase/ssr`. El build de Next si ejecuta TypeScript y pasa correctamente.
