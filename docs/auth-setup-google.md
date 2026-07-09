# Activar login con Google en Morvedre Core

> Cuando el login con Google falla con `400 (Bad Request)`, el provider no está habilitado en Supabase o las URLs de redirección no están en la whitelist. Esta guía te lleva paso a paso, con los clicks exactos y las URLs que copiar y pegar.

**Tiempo estimado: 8-12 minutos.** Solo tienes que hacerlo una vez por proyecto.

---

## 0. Diagnostico automatico (30 segundos)

Ejecuta el script de diagnostico. Te dice exactamente que te falta:

```bash
node scripts/check-auth-config.mjs
```

Salida esperada cuando esta todo bien:

```
[1] Variables de entorno
  ✓ NEXT_PUBLIC_SUPABASE_URL = https://hzplkjtfejqfulhhnlya.supabase.co
  ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_WCcg...
  ✓ NEXT_PUBLIC_APP_URL = http://localhost:3000

[2] Probando login con Google (smoke test)
  Status: 400 (esperado sin code_challenge; pero el error_msg debe ser de "code_challenge missing", no "not enabled")

[3] Providers externos (anon)
  ✓ Providers habilitados: google

[4] Conclusion
  Si todo arriba sale en verde, prueba el login de nuevo
```

Si el [2] dice "Unsupported provider: provider is not enabled" o el [3] dice "Ningun provider externo habilitado", sigue esta guia.

---

## 1. Google Cloud Console (5-7 min, una sola vez)

### 1.1. Crear proyecto

1. Abre https://console.cloud.google.com/apis/credentials en una pestaña nueva.
2. Arriba a la izquierda hay un selector de proyecto (un dropdown con un logo). Click en el.
3. En el popup que se abre, arriba a la derecha click **NEW PROJECT** (o **NUEVO PROYECTO**).
4. Rellena:
   - **Project name**: `Morvedre Core` (lo que quieras, pero ese es claro)
   - **Organization**: dejala como este
5. Click **CREATE** abajo a la derecha.
6. Espera 5-10 segundos. Te lleva al dashboard del proyecto nuevo.

### 1.2. Pantalla de consentimiento

1. En el menu lateral izquierdo (las tres rayitas ☰ arriba a la izquierda si no lo ves), click **APIs & Services** → **OAuth consent screen**.
   (Tambien puedes ir directo: https://console.cloud.google.com/apis/credentials/consent)
2. En **User Type** selecciona **External** (a menos que tengas Google Workspace).
3. Click **CREATE**.
4. Rellena SOLO estos campos (el resto lo dejas vacio):
   - **App name**: `Morvedre Core`
   - **User support email**: tu email (galvillo9@gmail.com)
   - **Developer contact information** → **Developer contact email**: tu email
5. Click **SAVE AND CONTINUE** (boton abajo a la derecha).
6. **Scopes**: click **SAVE AND CONTINUE** sin tocar nada.
7. **Test users**: click **ADD USERS** y añade tu email (galvillo9@gmail.com) y los emails de los que quieras que puedan entrar en desarrollo. Click **SAVE AND CONTINUE**.
8. **Summary**: click **BACK TO DASHBOARD**.

### 1.3. Crear Client ID

1. Menu lateral → **APIs & Services** → **Credentials**. (Directo: https://console.cloud.google.com/apis/credentials)
2. Arriba del medio click **+ CREATE CREDENTIALS** → **OAuth client ID**.
3. Si te pide configurar consent, hazlo (es el paso 1.2).
4. **Application type**: **Web application**.
5. **Name**: `Morvedre Core Web`.
6. En **Authorized JavaScript origins** click **+ ADD URI** y pega:
   ```
   http://localhost:3000
   ```
7. En **Authorized redirect URIs** click **+ ADD URI** y pega (es **EXACTA**, sin barra al final):
   ```
   https://hzplkjtfejqfulhhnlya.supabase.co/auth/v1/callback
   ```
   ⚠️ **Tu project ref es `hzplkjtfejqfulhhnlya`** (lo ves en `NEXT_PUBLIC_SUPABASE_URL`). Si el tuyo es otro, cambialo.
8. Click **CREATE** abajo.
9. Aparece un popup con tu **Client ID** (termina en `.apps.googleusercontent.com`) y **Client Secret** (una cadena aleatoria). Copialos. Los pegarás en Supabase en el siguiente paso.

**Ya no necesitas volver a Google Cloud Console.**

---

## 2. Activar Google en Supabase (1 min)

1. Abre https://supabase.com/dashboard/project/hzplkjtfejqfulhhnlya/auth/providers
   (Si te pide login, usa la cuenta con la que creaste el proyecto.)
2. En la lista de **Authentication Providers** busca la fila **Google** y click sobre ella.
3. Veras un toggle **Enable Sign in with Google** (o "Enabled"). Ponlo en **ON** / azul.
4. Aparece un formulario:
   - **Client ID**: pega el Client ID que copiaste de Google
   - **Client Secret (optional)**: pega el Client Secret
   - **Authorized Client IDs**: dejalo vacio
5. Click **SAVE** abajo.

---

## 3. Whitelist de Redirect URLs (1 min)

1. Abre https://supabase.com/dashboard/project/hzplkjtfejqfulhhnlya/auth/url-configuration
2. Busca el campo **Redirect URLs** (es un textarea, cada URL en una linea).
3. Asegurate de que estan estas (si no estan, añadelas, una por linea):
   ```
   http://localhost:3000/api/auth/callback
   http://localhost:3000/**
   ```
4. Mas abajo, **Site URL** pon `http://localhost:3000`.
5. Click **Save**.

---

## 4. Probar

1. En tu terminal: `pnpm dev` (si no lo tienes corriendo).
2. Abre http://localhost:3000/login
3. Click el boton **Continuar con Google** (o el icono de Google).
4. Te redirige a Google, autorizas con tu cuenta, vuelves a la app.

---

## 5. Verificar que esta todo bien

Corre otra vez:

```bash
node scripts/check-auth-config.mjs
```

Deberia decirte:

```
[2] Probando login con Google (smoke test)
  Status: 400 (esperado, "code_challenge missing" o similar)

[3] Providers externos (anon)
  ✓ Providers habilitados: google
```

Cuando veas el `✓`, ya esta.

---

## Errores comunes y como solucionarlos

### "This app isn't verified" (Google)

**En desarrollo** (lo que te pasa ahora): te sale un aviso grande. Click **Advanced** (abajo a la izquierda del aviso) → **Go to Morvedre Core (unsafe)**. Solo sale en desarrollo.

**En produccion**: tendras que verificar la app con Google (proceso de 1-2 semanas). Hasta entonces, solo los usuarios que esten en "Test users" (los que añadiste en el paso 1.2) podran entrar.

### "redirect_uri_mismatch" (Google)

La URI de redirect que pusiste en Google Cloud Console no coincide con la que Supabase espera. Debe ser EXACTAMENTE:

```
https://<tu-project-ref>.supabase.co/auth/v1/callback
```

Tu project ref es lo que va despues de `https://` y antes de `.supabase.co` en tu `NEXT_PUBLIC_SUPABASE_URL`. Para tu proyecto, es `hzplkjtfejqfulhhnlya`.

### "Signups not allowed" (despues de hacer login con Google)

Tu proyecto tiene `enable_signup = false` (lo vemos en `supabase/config.toml`). Esto significa que **los usuarios no pueden crear su propia cuenta de auth directamente**; el admin la crea al aprobar una solicitud de acceso.

El flujo actual (esta en `app/api/auth/callback/route.ts` y `server/actions/auth.ts`):

- La persona hace login con Google.
- Si su email no esta vinculado a un perfil aprobado, se le redirige a `/login/request` para enviar una solicitud.
- El admin revisa la solicitud en `/admin/access-requests` y la aprueba.
- Al aprobar, el sistema crea la cuenta de auth y vincula el perfil.
- En el primer login, se le obliga a cambiar la contraseña temporal.

Si quieres que cualquier email de Google pueda entrar sin pasar por el admin, ve a Supabase Dashboard → **Authentication** → **Sign In/Up** → **User Signups** → pon **ON** el toggle "Allow new users to sign up" (NO recomendado para el club).

### "Email not confirmed" (Supabase)

Si el email del jugador no esta verificado, Supabase rechaza el login. Ve a **Authentication** → **Sign In/Up** → **Email** → desactiva "Confirm email" (NO recomendado en produccion) o configura SMTP para enviar emails de confirmacion.

### El boton de Google no aparece en /login

Revisa que `components/auth/login-form.tsx` lo tenga renderizado. Si lo tiene, abre DevTools (F12) → Console y mira si hay un error de JS.

### "OAuth server is disabled" (en vez de "not enabled")

Esto es un caso raro. Significa que el feature flag de OAuth esta completamente deshabilitado en el proyecto. No puedes arreglarlo desde el dashboard. Tienes que escribir a **support@supabase.io** pidiendo que lo activen. En el correo incluye:

- Tu project ref: `hzplkjtfejqfulhhnlya`
- El mensaje exacto del error
- Que quieres usar Google OAuth

---

## Si aun asi no funciona

1. Corre `node scripts/check-auth-config.mjs` y pegame el output completo.
2. Abre DevTools (F12) → Network → filtra por `authorize` → pegame la respuesta exacta.
3. En Supabase Dashboard, ve a **Logs** → **Auth Logs** y mira el error exacto del intento fallido.
