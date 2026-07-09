# Resumen de Fase 6 - Tesoreria

> Estado: implementada en local. Pendiente aplicar la migracion `0032_treasury.sql` en Supabase.

## Logros

### Base de datos

- `0032_treasury.sql`
- Tablas:
  - `treasury_concepts`
  - `treasury_profile_concepts`
  - `treasury_period_closures`
  - `treasury_lines`
- Enums:
  - `treasury_concept_kind`
  - `treasury_periodicity`
  - `treasury_applies_to`
  - `treasury_closure_status`
  - `treasury_payment_method`
- RLS en todas las tablas.
- Admin escribe todo.
- Directiva puede leer tesoreria.
- Familias/jugadores pueden leer sus propias lineas pendientes.

### Dominio

- `lib/domain/treasury.ts`
- `buildPeriodClosure`
- Conversion euros/centimos.
- Formato de importes.
- Cierre mensual con:
  - conceptos asignados
  - conceptos globales para jugadores
  - descuentos
  - pedidos de tienda del periodo

### Server Actions

- `upsertTreasuryConcept`
- `assignTreasuryConcept`
- `buildTreasuryPeriodClosure`
- `markTreasuryLinePaid`

### Queries

- `getTreasuryDashboard`
- `getTreasuryClosure`
- `getFamilyTreasury`

### UI

- `/admin/treasury`
  - Crear concepto
  - Asignar concepto a perfil
  - Generar cierre mensual
  - Ver cierres
  - Ver ultimas lineas
- `/admin/treasury/closures/[id]`
  - Resumen del cierre
  - Total, pagado, pendiente
  - Marcar lineas como pagadas
  - Descargar Excel
- `/treasury`
  - Vista familiar/jugador con importes pendientes
- Acceso desde AdminTabs y panel admin.
- Acceso rapido "Pagos" en Inicio.

### Export

- Ruta protegida:
  - `/api/treasury/closures/[id]/export`
- Genera `.xlsx` con `xlsx`.
- Requiere admin.

## Tests

- `tests/unit/treasury.test.ts`
- 5 tests:
  - euros a centimos
  - formato de importes
  - etiqueta mensual
  - cierre con cuota + descuento + tienda
  - ignorar asignaciones fuera de periodo/inactivas

## Validacion local

```
pnpm run test:run tests/unit/treasury.test.ts
Test Files  1 passed
Tests       5 passed
```

Rutas sin sesion:

- `/admin/treasury` -> 307
- `/treasury` -> 307
- `/api/treasury/closures/:id/export` -> 401

## Pendiente para probar en cloud

1. Aplicar `supabase/migrations/0032_treasury.sql`.
2. Entrar como admin.
3. Ir a `/admin/treasury`.
4. Crear concepto `CUOTA_MENSUAL`.
5. Asignarlo a un jugador o usar `Jugadores`.
6. Generar cierre del mes.
7. Descargar Excel.
8. Marcar una linea como pagada.
9. Cambiar a perfil familiar/jugador y revisar `/treasury`.
