# FIX: Login con email/password redirige incorrectamente a /login

## Resumen del problema

El login con email/password falla en el flujo de Next.js 16 + Supabase SSR. El `signIn` server action se ejecuta correctamente, las cookies de sesión SÍ se setean, pero el navegador termina siempre en `/login` en lugar de en el destino (`/dashboard` o `/change-password`). El login con Google OAuth funciona correctamente.

## Síntomas exactos

1. El usuario introduce email + password en `/login`
2. El `<form>` submitea, se ejecuta el server action `signIn` en `server/actions/auth.ts:46`
3. `supabase.auth.signInWithPassword()` tarda ~20 segundos y luego devuelve error (o éxito que se pierde)
4. El navegador termina siempre en `http://localhost:3000/login` con `?error=invalid_credentials` (o sin error, pero sigue en /login)
5. Las cookies `sb-{ref}-auth-token.0` y `.1` SÍ se setean en el response del server action
6. El `proxy.ts` (middleware) hace `await supabase.auth.getUser()` que triggerea un refresh del token, tarda 20+ segundos y devuelve un error de "user not found"
7. El layout `(app)/layout.tsx` llama a `getActiveProfileContext()` que ejecuta su propio `getUser()`. Si las cookies están desactualizadas (porque el refresh del token las modificó), devuelve null
8. Si `getActiveProfileContext` devuelve null, el layout hace `redirect("/login")`
9. Hay un comportamiento secundario de pre-fetch: el `<form>` con `useActionState` y `<form action={formAction}>` causa que Next.js pre-fetche el RSC del form. Eso se manifiesta como 2 GETs a `/login?_rsc=...` después del login

## Archivos relevantes

- `server/actions/auth.ts:46` — función `signIn` que ejecuta `supabase.auth.signInWithPassword`
- `lib/supabase/middleware.ts:46` — el `proxy.ts` que ejecuta `await supabase.auth.getUser()` en cada request
- `lib/supabase/server.ts:6` — `createClient()` que crea el cliente Supabase con cookies
- `server/queries/active-profile.ts:33` — `getActiveProfileContext()` que valida la sesión
- `app/(app)/layout.tsx:14` — el layout que redirige a /login si el context es null
- `components/auth/login-form.tsx:38` — el componente del form con `useActionState` + `useEffect` + `window.location.href`

## Diagnóstico previo (qué ya sabemos)

Ya hice pruebas E2E con Playwright headless (cookies pre-seteadas via API) y confirmé:

1. **El signIn action SÍ funciona via API directa** (curl a `/auth/v1/token` devuelve sesión válida en <500ms)
2. **El problema es específico del flujo Next.js + Supabase SSR**:
   - El `signInWithPassword` server-side triggerea un `getUser()` que intenta refrescar el token
   - El refresh tarda 20+ segundos (posiblemente por la red a Supabase)
   - El `getUser()` falla con "user not found" porque el token está siendo refrescado simultáneamente
3. **El server action tarda 20s en completarse** y devuelve un error de autenticación
4. **El flujo con Google OAuth SÍ funciona** porque no pasa por `signInWithPassword`

## Causa raíz más probable (a verificar)

El `proxy.ts` (middleware) ejecuta `await supabase.auth.getUser()` en CADA request. Esto triggerea:

- Una llamada a `/auth/v1/user` para validar el token
- Si el token está a punto de expirar, un refresh automático que actualiza las cookies

El problema es que durante el signIn:

1. El `signIn` server action ejecuta `signInWithPassword` (que setea cookies nuevas con token fresco)
2. El `proxy.ts` se ejecuta en cada request y triggerea un refresh del token
3. El refresh puede tardar 20s y puede fallar si el `getUser` se ejecuta concurrentemente con el `signInWithPassword`
4. El `getActiveProfileContext` del layout hace otro `getUser` que también puede fallar por el mismo motivo

Hay un deadlock/race condition entre:

- El `signInWithPassword` que setea cookies
- El `getUser` del `proxy.ts` que refresca el token
- El `getUser` del `getActiveProfileContext` que valida la sesión

## Cómo se debería hacer correctamente

La forma correcta de implementar el login en Next.js 16 con Supabase SSR es:

### Opción A (recomendada): Patrón simple con `window.location.href`

1. El `signIn` server action hace el `signInWithPassword` y luego ejecuta `redirect(target)`.
2. NO uses `useActionState` con redirect. Usa un form nativo con `action={signIn}`.
3. Next.js 16 propaga automáticamente el `NEXT_REDIRECT` cuando se lanza en un server action. El browser sigue el 303.
4. Si hay error, redirige a `/login?error=CODE` y el componente de login lee el query string.

### Opción B: Patrón con return + useEffect

1. El `signIn` server action devuelve `{ error?: string; redirectTo?: string }` (sin `redirect()`).
2. El cliente usa `useActionState` para capturar el state.
3. Un `useEffect` detecta `state.redirectTo` y hace `window.location.href = state.redirectTo` (NO `router.push`).
4. Esto evita el doble submit y el pre-fetch problemático.

### Opción C: Desactivar el refresh en el `proxy.ts`

1. El `proxy.ts` debe ser minimal: solo actualizar cookies si Supabase las cambia, sin hacer `getUser()`.
2. La validación de sesión se hace SOLO en el layout con `getActiveProfileContext()`.
3. El `signIn` server action maneja su propia lógica sin depender del middleware.

## Lo que NO debe hacerse

- NO uses `useRouter().push()` desde un `useEffect` con `useActionState`. El router puede triggerear pre-fetches que causen navegaciones inesperadas.
- NO hagas `getUser()` en el `proxy.ts` con timeout corto (como intenté). El timeout puede cortar el refresh del token y dejar la sesión en un estado inconsistente.
- NO uses `try/catch` para capturar el `NEXT_REDIRECT` en el cliente. Eso bloquea la propagación del redirect.

## Pasos concretos para arreglarlo (orden recomendado)

### Paso 1: Diagnosticar el problema exacto

Antes de tocar nada, ejecuta este test para confirmar dónde está el problema:

```bash
# Crear archivo scripts/diagnose-login.mjs con esta logica:
import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

// Capturar TODOS los requests y responses
const events = [];
page.on("request", (req) => events.push({ type: "REQ", method: req.method(), url: req.url() }));
page.on("response", (res) => events.push({ type: "RES", status: res.status(), url: res.url() }));
page.on("framenavigated", (frame) => events.push({ type: "NAV", url: frame.url() }));

// Hacer login via form
await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
await page.fill('input[name="email"]', "galvillo9@gmail.com");
await page.fill('input[name="password"]', process.env.TEST_PASSWORD);
await page.click('button[type="submit"]');

// Esperar 30 segundos y ver qué pasa
await page.waitForTimeout(30000);

// Imprimir todos los eventos con timing
events.forEach((e, i) => {
  console.log(`${i}: [${e.type}] ${e.method ?? e.status ?? ""} ${e.url?.replace("http://localhost:3000", "")}`);
});

await browser.close();
```

Ejecuta el script y mira el log. Identifica:

- ¿Cuántos POST /login hay?
- ¿Cuánto tarda cada uno?
- ¿Hay 307/303 redirects?
- ¿Cuántos GET a /dashboard?\_rsc=... hay?
- ¿Cuántos GET a /login?\_rsc=... hay?
- ¿Cuándo cambia la URL a /login?

### Paso 2: Identificar la causa exacta

Con el log del paso 1, determina:

- ¿El `signIn` devuelve 307 (redirect) o 200 (sin redirect)?
- ¿El `signIn` tarda mucho o poco?
- ¿El `getUser` del `proxy.ts` triggerea un refresh del token?
- ¿Hay un doble submit (form submitea dos veces)?

### Paso 3: Aplicar el fix

Basado en el diagnóstico, aplica UNA de estas opciones:

**Opción A (recomendada si el problema es `useActionState` + redirect):**

1. En `server/actions/auth.ts`, mantén el `redirect()` al final del signIn.
2. En `components/auth/login-form.tsx`, usa `<form action={signIn}>` directamente sin `useActionState`.
3. Si hay errores, redirige a `/login?error=CODE` y lee el query string con `useSearchParams`.

**Opción B (recomendada si el problema es el refresh del token):**

1. En `lib/supabase/middleware.ts`, quita el `await supabase.auth.getUser()`.
2. Deja que el `proxy.ts` solo pase la request al siguiente handler.
3. La validación de sesión se hace SOLO en el `app/(app)/layout.tsx` con `getActiveProfileContext()`.
4. Asegúrate de que `getActiveProfileContext()` use el cliente correcto y tenga un timeout.

**Opción C (si las opciones A y B no funcionan):**

1. En `server/actions/auth.ts`, NO uses `redirect()`. Devuelve `{ error?: string; redirectTo?: string }`.
2. En `components/auth/login-form.tsx`, usa `useActionState` con `useEffect` que hace `window.location.href = state.redirectTo`.
3. En `lib/supabase/middleware.ts`, simplifica el `proxy.ts` para no hacer `getUser()`.

### Paso 4: Verificar el fix

Después de aplicar el fix, ejecuta el script del paso 1 de nuevo. El resultado esperado:

- Un solo POST /login
- Un solo GET a /dashboard (o /change-password)
- URL final: /dashboard (o /change-password)
- Tiempo total: < 5 segundos

También ejecuta el test E2E con Playwright para verificar que el flujo completo funciona.

### Paso 5: Tests automatizados

Crea un test E2E con Playwright en `tests/e2e/login.spec.ts` que verifique:

1. Login con email/password redirige a /dashboard (o /change-password)
2. Las cookies se setean correctamente
3. El usuario puede acceder a páginas protegidas después del login
4. El login con credenciales inválidas muestra el error correcto
5. El login con Google OAuth sigue funcionando

## Restricciones

- NO modifiques la DB (no hay migraciones pendientes)
- NO cambies la versión de Next.js, React, Supabase, o cualquier otra dependencia
- NO elimines código de autenticación existente
- Mantén la compatibilidad con el flujo de Google OAuth
- El fix debe ser retrocompatible con el código existente

## Archivos a tocar (estimación)

- `server/actions/auth.ts` — modificar `signIn` (10-30 líneas)
- `components/auth/login-form.tsx` — posiblemente reescribir el form (50-100 líneas)
- `lib/supabase/middleware.ts` — posiblemente simplificar el `proxy.ts` (10-20 líneas)
- `app/(app)/layout.tsx` — verificar que el manejo de sesión sea correcto (0-10 líneas)
- `tests/e2e/login.spec.ts` — crear test E2E (50-100 líneas, nuevo archivo)

## Output esperado

1. El usuario puede iniciar sesión con las credenciales E2E configuradas mediante `TEST_ADMIN_EMAIL` y `TEST_PASSWORD`.
2. Después del login, el navegador va a `/dashboard` (o `/change-password` si `must_change_password` es true).
3. El usuario puede acceder a todas las páginas autenticadas.
4. El login con Google OAuth sigue funcionando.
5. El login con credenciales inválidas muestra el error correcto.
6. Los tests E2E pasan.
7. No hay regresiones en otros flujos.

## Cómo reportar el resultado

Cuando termines, reporta:

1. La causa raíz exacta que encontraste
2. La opción que aplicaste (A, B, o C)
3. Los archivos modificados y los cambios
4. El resultado del test E2E
5. Cualquier side-effect o regresión encontrada
