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

