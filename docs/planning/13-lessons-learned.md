# Lecciones aprendidas — errores a no repetir

> Documento de equipo. Cada entrada es algo que salió mal durante el desarrollo de Fase 0 y la forma correcta de hacerlo en el futuro. Actualizar cuando se descubra un patrón nuevo.

## 2026-06-26 — Fase 0

### 1. El nombre del directorio de trabajo importa para npm/pnpm

**Lo que pasó**: `pnpm create next-app .` en `C:\Users\galvi\Documents\Morvedre core` falló porque el nombre "Morvedre core" tiene mayúsculas y espacios, que npm rechaza.

**Lo correcto**: usar un directorio con nombre URL-friendly para el scaffold inicial, o pasar el flag `--name` al crear. Después se puede renombrar el directorio si hace falta.

### 2. pnpm 11 ignora `pnpm.onlyBuiltDependencies` en package.json

**Lo que pasó**: Añadí `"pnpm": { "onlyBuiltDependencies": ["sharp", "unrs-resolver"] }` a `package.json` pensando que funcionaría. pnpm 11+ ignora ese campo y lo lee de `pnpm-workspace.yaml` con la sintaxis `allowBuilds:`.

**Lo correcto**: en `pnpm-workspace.yaml`:
```yaml
allowBuilds:
  sharp: true
  unrs-resolver: true
```

### 3. La credencial de Git cacheada puede estar mal

**Lo que pasó**: el `git push` fallaba con "Permission denied to Rga9rga" porque Windows Credential Manager tenía una credencial cacheada de OTRA cuenta de GitHub.

**Lo correcto**: limpiar credenciales cacheadas antes del primer push si se sospecha que puede haber conflicto:
```powershell
cmdkey /list:LegacyGeneric*target=git:https://github.com*
cmdkey /delete:LegacyGeneric:target=git:https://github.com
```

### 4. Next.js 16 deprecó `middleware.ts` en favor de `proxy.ts`

**Lo que pasó**: Creé `middleware.ts` siguiendo la documentación. Next 16 muestra warning "middleware file convention is deprecated, use proxy instead".

**Lo correcto**: en proyectos nuevos con Next 16+, usar `proxy.ts` directamente. No bloqueante (sigue funcionando), pero el rename debería hacerse.

### 5. Build de producción con credenciales Supabase vacías

**Lo que pasó**: `pnpm build` falla al pre-renderizar `/change-password` si las env vars de Supabase no están configuradas, porque la página llama a `createClient()` que lanza error.

**Lo correcto**: las páginas que requieren auth deberían marcarse como dinámicas (`export const dynamic = 'force-dynamic'`) o tener un fallback para build time. Ya está documentado en `12-phase-0-summary.md` pero conviene tenerlo en cuenta para futuras Server Components con Supabase.

### 6. El subagente de Supabase debe esperar al subagente de UI

**Lo que pasó**: lancé 4 subagentes en paralelo. El de Supabase asumió que existía un campo `must_change_password` en el modelo. El subagente de DB tenía que añadirlo en la migración pero no estaba en la conversación. Al final, el subagente de UI tuvo que añadirlo a los types manualmente.

**Lo correcto**: definir el contrato de datos (tipos TypeScript de Supabase) ANTES de lanzar subagentes que lo consuman. O documentar explícitamente qué columnas existen y pasarlo a todos los subagentes relevantes.

### 7. Subagentes no comparten estado de git

**Lo que pasó**: varios subagentes hicieron cambios y yo tuve que reconciliar todo antes de commitear. Si uno de ellos hubiera hecho `git status` o `git add` por su cuenta, habría sido un problema.

**Lo correcto**: dejar claro a cada subagente que NO haga commits, push, ni cambios en git. Solo escribir archivos y reportar.

### 8. Pnpm 11 y `--shamefully-hoist`

**Lo que pasó**: Usé `--shamefully-hoist` como workaround para el problema de build scripts. Funcionó pero es un parche.

**Lo correcto**: usar `pnpm-workspace.yaml` con `allowBuilds` desde el principio. Es la solución oficial.

### 9. Prompts de subagentes muy densos

**Lo que pasó**: mis prompts para los subagentes eran muy largos y detallados. Algunos subagentes no leyeron todo y se perdieron detalles (por ejemplo, no sabían que `must_change_password` debería existir).

**Lo correcto**: prompts más cortos, con un documento de contexto separado al que el subagente pueda referirse. O ejecutar las tareas más críticas de forma secuencial con prompts cortos.

### 10. La primera vez con la skill de Supabase

**Lo que pasó**: No leí la skill de Supabase con suficiente cuidado. Contiene reglas críticas de seguridad (no usar `auth.role()`, usar `TO authenticated`, evitar `SECURITY DEFINER` en public) que apliqué bien al final, pero me habría ahorrado iteraciones leerla primero.

**Lo correcto**: leer la skill completa antes de empezar, no solo cuando aparece un error.

## Patrones a seguir en futuras fases

1. **Definir el contrato de tipos antes de paralelizar** — un solo archivo de tipos que todos los subagentes pueden leer
2. **Prompts cortos + documento de contexto** — el subagente lee el contexto bajo demanda
3. **Cada subagente deja una "tarjeta de salida"** con qué archivos tocó y por qué
4. **Validar (lint + typecheck + build) después de cada wave, no solo al final**
5. **Subagente de validación dedicado al final** que ejecute todas las pruebas y reporte issues
6. **Renombrar cosas deprecated desde el principio** (middleware → proxy en Next 16)
7. **Comprobar credenciales de git ANTES de empezar** a trabajar

## 2026-06-26 — Fase 1

### 1. Los subagentes no comparten estado de archivos

**Lo que pasó**: lancé dos subagentes de Wave 1 (DB migrations y domain functions) en paralelo. El segundo (UI redesign) dependía de assets que el primero estaba creando. Cuando el segundo revisó, no encontró los archivos y se paró "esperando".

**Lo correcto**: Wave 1 de Fase 1 lo arreglé lanzando primero DB+Domain (independientes), y luego Wave 2 con Admin UI (que lee los assets de Wave 1). Pero el rediseño de Fase 0 lo pifié.

**Regla**: el prompt del subagente debe decir explícitamente "verifica que X existe antes de empezar, si no espera" o "asume que Y ya está hecho por otro subagente".

### 2. La regla `canRosterPlayer` no es simétrica

**Lo que pasó**: la spec del SRS decía "matriz de ascensos" con reglas N-1, N, N+1. Pero los tests del usuario (que él mencionó antes) implicaban que un Cadete puede jugar en Benjamín, lo que requiere N-3. La regla real del waterpolo español es asimétrica: un mayor puede bajar a categorías inferiores libremente, pero solo puede subir 1 categoría.

**Lo correcto**: el subagente de tests lo detectó y preguntó. La regla final: el equipo puede estar como mucho 1 categoría por encima del jugador, sin límite hacia abajo. Documentado en `lib/domain/teams.ts`.

**Regla**: cuando el SRS tiene una regla que parece no cuadrar con casos reales, el subagente debe marcarlo y proponer la regla correcta con justificación.

### 3. El subagente que verifica "pre-existing errors" mentía a veces

**Lo que pasó**: el subagente de Wave 3 dijo "3 pre-existing errors en untracked admin code". Al verificar yo mismo, el typecheck estaba limpio.

**Lo correcto**: no confiar en los reportes de "errores pre-existentes" sin verificar. Hacer typecheck yo mismo al final de cada wave.

### 4. La política `profiles_insert_admin` faltaba en la migración 0001

**Lo que pasó**: la migración 0001 solo permite insert en `profiles` al `service_role`. Pero queríamos que el admin pudiera crear profiles directamente con su sesión autenticada (no vía service role client).

**Lo correcto**: añadir migración 0008 con la policy `profiles_insert_admin`. Si no, el subagente habría tenido que usar el service role client en todas las acciones admin, lo cual es un anti-pattern.

### 5. `xlsx` no tiene `exports` field

**Lo que pasó**: `import { read, utils } from 'xlsx'` falla porque el paquete xlsx no define `exports` en su package.json. Solo `main` (CJS). El import con nombre falla.

**Lo correcto**: usar `import xlsx from 'xlsx'` (default import) y luego `xlsx.read(...)`, `xlsx.utils.sheet_to_json(...)`. Documentado en el script.

### 6. La query `getActiveProfileContext` no estaba clara

**Lo que pasó**: tenía que resolver el perfil activo (el usuario + sus hijos + el hijo seleccionado por cookie). El subagente lo hizo bien pero el patrón se repitió en varios sitios.

**Lo correcto**: extraer un helper `getActiveProfileContext()` en `server/queries/active-profile.ts` que devuelve `{ ownProfile, activeProfile, linkedProfiles }`. Usar en todos los sitios que necesiten el contexto.

### 7. El dashboard inicial no manejaba bien perfiles "huérfanos"

**Lo que pasó**: si un padre no tiene `parent_child_links` configurados, el dashboard fallaba al intentar cargar el "active child".

**Lo correcto**: manejar los null con `??` o condicionales. Si no hay hijos, mostrar un empty state "Configura los vínculos familiares desde el panel admin".

## Patrones específicos de Fase 1 a recordar

1. **Seed mínimo útil**: 3 temporadas (pasada, presente, futura) con `is_current` en la futura. El admin no debería tener que crear la temporada actual manualmente.
2. **Categoría calculada, no almacenada**: usar `inferCategory(birth_year, current_year)` en cada render. No en DB.
3. **Color del equipo propagado**: cuando se crea un equipo, copiar su `color` al `team_color` del profile al asignar. La UI lo puede hacer vía trigger o app code.
4. **Import idempotente**: el script de import debe poderse correr múltiples veces sin duplicar. Usar `full_name + birth_year` como natural key.
5. **Roster validation centralizada**: `canRosterPlayer` se usa en el server action `rosterPlayer` para validar antes de insertar. No en el cliente.

## 2026-06-26 — Auditoría de Fase 1

Auditoría profunda de Fase 1. Encontrados **4 críticos, 18 altos, 47 medios, 25 bajos** (94 totales). Todos los críticos y los altos prioritarios arreglados en un commit.

### Lecciones de la auditoría

1. **Los `toggle` en formularios son trampas** (C1)
   - Si el toggle añade el campo solo cuando está `on`, el `false` se omite y el server asume `?? true`. Resultado: `must_change_password` siempre se persiste como `true`.
   - **Regla**: siempre envía el booleano, sea `on` u `off`. En el server, trata la ausencia como `false` explícitamente.

2. **Una RLS `to authenticated using (true)` no es necesariamente correcta** (C2)
   - Permite ver datos sensibles (PII) a cualquier usuario logueado.
   - **Regla**: si una tabla tiene columnas privadas (como `phone_e164`), la policy debe ser restrictiva, y exponer los datos públicos via una **view** con `security_invoker = true` + `grant select to authenticated`.

3. **`next/image` rompe con URLs externas sin `remotePatterns`** (C3)
   - El componente falla silenciosamente en runtime. Solo se ve en consola.
   - **Regla**: añade `images.remotePatterns` desde el primer momento si vas a usar URLs externas (Supabase Storage, CDN, etc.).

4. **Los badges de color sólido necesitan test de contraste** (C4)
   - `bg-white` + `text-paper` = invisible. Solo se ve en pantalla.
   - **Regla**: para badges con fondo de color, usa SIEMPRE `text-brand-deep` o computa el contraste por luminancia.

5. **Acciones destructivas sin confirmación son accidentes esperando** (H1, H2)
   - `archiveSeason`, `unrosterPlayer`, `unassignStaff`, `unlinkFamily` se ejecutaban con un click.
   - **Regla**: toda acción destructiva pasa por `window.confirm()` o un `ConfirmDialog`. No hay excusas.

6. **Las operaciones multi-statement deben ser atómicas** (H3)
   - `setCurrentSeason` hacía 3 updates secuenciales. Concurrencia = estado intermedio inconsistente.
   - **Regla**: para operaciones que afectan a varias filas con un constraint, usa un RPC de Postgres (`create function`) o un solo `UPDATE` con `WHERE` que cubra todas las filas.

7. **Las validaciones de negocio necesitan contexto** (H4)
   - `canRosterPlayer` usaba `new Date().getFullYear()`. Pero un jugador de 2009 rostering en un equipo de la temporada 2024/25 (cuando tenía 15 años) tiene que validarse con el año de ESA temporada, no del presente.
   - **Regla**: las funciones de dominio que dependen del tiempo deben recibir el tiempo como parámetro, no leerlo internamente.

8. **Los `catch {}` vacíos son bugs disfrazados** (H5, H6)
   - El import "se tragaba" errores y reportaba éxito con datos perdidos.
   - **Regla**: `catch` debe narrow al error específico esperado (ej. `code === "23505"` para unique violation) o re-throw. Nunca swallow todo.

9. **Duplicar lógica de dominio entre .ts y .mjs es trampa** (H13)
   - El import script tenía su propia copia de `inferCategory` y `CATEGORY_LABELS`.
   - **Regla**: extrae a un `.mjs` (o un `.ts` compilable) que ambos puedan importar. Si no, con el tiempo divergen.

10. **Los tipos no se regeneran automáticamente** (H14)
    - El tipo generado de `user_roles.granted_by` decía `string` (no nullable), pero la columna DB era nullable.
    - **Regla**: cuando cambies el schema, regenera los tipos con `supabase gen types typescript --local`. Si lo editas a mano, anota el desfase.

11. **Los tests del admin no se podían escribir antes porque las actions no estaban extraídas** (H general)
    - Las server actions estaban "in line", difíciles de testear.
    - **Regla**: extrae los Zod schemas a un módulo aparte (`admin-schemas.ts`). Los tests pueden importar los schemas sin tocar la action.

12. **El test count de AGENTS.md se desactualiza rápido**
    - Decía 53, ahora son 187. Hay que actualizarlo en cada commit que añada tests.

13. **El e2e real requiere docker o cloud** (no tenemos docker en este entorno)
    - Por eso los integration tests usan el cloud de Supabase y skip si no hay env vars.
    - **Regla**: marcar con `it.skip()` los tests que dependen de env, no fallarlos.

### Patrón para futuras auditorías

Cuando hagas una auditoría seria:
1. Lee **todos** los archivos del scope, no solo los que crees problemáticos
2. Clasifica cada issue por severidad (🔴🟠🟡🟢) **antes** de empezar a arreglar
3. Reporta primero, arregla después. No mezclar.
4. Para tests: pide matrix de qué hay testeado y qué no
5. El top 5 de "fix first" es el entregable principal de la auditoría

Patrón usado en esta auditoría: subagente dedicado con prompt estructurado por categorías (bugs, security, edge cases, UX, code quality, performance, a11y, tests, docs).

