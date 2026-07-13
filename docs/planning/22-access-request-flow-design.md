# Diseño del nuevo flujo de acceso (invitación por admin)

> Planificación cerrada tras la batería de preguntas con el stakeholder. Este documento es la base de implementación.

## 1. Objetivo

Sustituir el registro público por código de invitación por un flujo en el que **solo el admin (Rubén) puede aprobar quién entra en la app**. Cualquiera puede intentar iniciar sesión, pero si su email no está vinculado a un perfil aprobado, solo podrá rellenar una solicitud y esperar a que el admin la apruebe.

## 2. Decisiones cerradas

| Tema                                        | Decisión                                                                                                                                           | Implicación técnica                                                                                                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Registro por código (`/register`)           | Se elimina por completo.                                                                                                                           | Se borra la página, el formulario, las server actions y la tabla `registration_codes`.                                                                       |
| Perfiles de staff (coach, admin, directiva) | El admin los crea manualmente desde el nuevo panel.                                                                                                | El panel `/admin/access-requests` servirá también para dar de alta a entrenadores y directivos.                                                              |
| Usuarios ya registrados                     | Siguen entrando igual.                                                                                                                             | No se tocan sus contraseñas ni perfiles.                                                                                                                     |
| Contraseña temporal                         | Única, aleatoria y distinta para cada activación.                                                                                                  | Se genera al aprobar, se muestra una sola vez al admin y no se almacena en texto plano.                                                                      |
| Caducidad de la contraseña                  | Se sustituye en el primer acceso.                                                                                                                  | `must_change_password` impide usar la aplicación hasta definir una contraseña propia.                                                                        |
| Canal para pasar la contraseña              | El admin la envía por email/WhatsApp manualmente.                                                                                                  | El sistema no envía la contraseña al usuario; sí avisa al admin de que hay solicitudes nuevas.                                                               |
| Proveedor de email para avisos al admin     | **Resend** (100 emails/día gratis).                                                                                                                | Habrá que configurar `RESEND_API_KEY` y `RESEND_FROM_EMAIL`.                                                                                                 |
| Google OAuth                                | Si el email no está vinculado, va al formulario de solicitud.                                                                                      | Tras aprobar, el usuario puede seguir entrando con Google y también con email+contraseña; se le obligará a definir una contraseña propia en el primer login. |
| Modelo de solicitudes                       | Tabla `access_requests` separada.                                                                                                                  | Estados: `pending` → `approved` → `activated`. Los rechazados se eliminan.                                                                                   |
| Aprobación                                  | Panel `/admin/access-requests` con opción de aprobar/rechazar una a una o en bloque.                                                               | Tabla con acciones masivas.                                                                                                                                  |
| Rechazo                                     | La solicitud se elimina.                                                                                                                           | El email puede volver a solicitar acceso sin bloqueo.                                                                                                        |
| Datos del formulario de jugador             | Nombre completo, fecha de nacimiento (solo año) y género.                                                                                          | No se piden teléfono ni dorsal en la solicitud; esos se completan luego.                                                                                     |
| Quién solicita cuenta de jugador            | Ambos: el propio jugador o un padre/madre.                                                                                                         | El flujo es el mismo; el solicitante usa el email con el que quiere entrar.                                                                                  |
| Niño sin email propio                       | El padre lo gestiona desde su cuenta de padre; el hijo no tiene login propio.                                                                      | El perfil del hijo debe existir previamente (dado de alta por admin o por solicitud con email del hijo si lo tiene).                                         |
| Emparejamiento con perfil existente         | Automático si coinciden nombre y apellidos (sin importar mayúsculas) y año de nacimiento. Si hay duda, se muestran candidatos y el admin confirma. | Server action de normalización de texto + comparación por año.                                                                                               |
| "Perfil activado"                           | El usuario ha cambiado ya su contraseña temporal por una propia.                                                                                   | Estado final del flujo. Mientras tanto es `approved` (admin ya dio el ok).                                                                                   |
| Búsqueda de hijos en formulario de padre    | Coincidencia exacta por nombre completo y año de nacimiento.                                                                                       | Reduce la enumeración pública de menores y devuelve solo coincidencias activables.                                                                           |
| Varios hijos                                | Sí, un padre puede seleccionar varios en la misma solicitud.                                                                                       | Tabla intermedia `access_request_children`.                                                                                                                  |
| Hijo no existe/no activado                  | Se bloquea el envío y se explica el paso previo.                                                                                                   | Mensaje claro: solicitar primero la cuenta de jugador o pedir al club el alta.                                                                               |
| Relación padre-hijo                         | Se pregunta en el formulario: madre, padre, tutor legal, otro.                                                                                     | Se guarda en `parent_child_links.relation`.                                                                                                                  |
| Límites de spam                             | Límite amplio por email/IP, opcional y sencillo.                                                                                                   | Por ejemplo, máximo 3 solicitudes por email en 24h.                                                                                                          |
| Emails temporales                           | No se bloquean.                                                                                                                                    | Sin validación de dominios desechables.                                                                                                                      |
| Verificación de identidad                   | Manual por el admin, como en un club real.                                                                                                         | Sin pruebas adicionales de propiedad de email.                                                                                                               |

## 3. Estados de una solicitud

```
pending     → el usuario ha enviado la solicitud, el admin no ha actuado
approved    → el admin ha aprobado; el sistema ha creado la cuenta auth
              con una contraseña aleatoria que se muestra al admin una sola vez.
activated   → el usuario ha entrado y ha cambiado la contraseña.
rejected    → se elimina la solicitud (no se persiste).
```

La transición a `activated` ocurre automáticamente cuando `profiles.must_change_password` pasa a `false`.

## 4. Flujos de usuario

### 4.1. Login con email/contraseña existente

1. El usuario introduce email y contraseña.
2. Si existe `auth.users` + `profiles` vinculado → entra.
3. Si `must_change_password = true` → `/change-password`.

### 4.2. Email no registrado

1. El usuario introduce email y contraseña cualquiera.
2. `signIn` falla. Antes de devolver error, el servidor comprueba si el email existe en `profiles` o en `access_requests`.
3. Si no existe → redirige a `/login/request?email=...`.
4. El usuario elige si es **jugador** o **padre/madre**.

### 4.3. Solicitud de jugador

1. Formulario: nombre completo, año de nacimiento, género.
2. El sistema busca perfiles con el mismo nombre normalizado + año de nacimiento.
   - Si hay coincidencia única → la solicitud queda vinculada a ese `profile_id` como candidato.
   - Si hay varias coincidencias → el admin verá candidatos y elegirá.
   - Si no hay coincidencia → se creará un nuevo perfil al aprobar.
3. Se envía email de aviso al admin (`galvillo9@gmail.com`).
4. Se muestra pantalla de "solicitud enviada, pendiente de activación".

### 4.4. Solicitud de padre/madre

1. Formulario: nombre completo del padre/madre, relación, búsqueda de hijos.
2. Búsqueda exacta por nombre completo y año de nacimiento contra perfiles de jugador.
3. Solo permite seleccionar hijos que ya existan como perfiles en el club.
   - Si un hijo no aparece, se bloquea y se explica: "Si tu hijo/a tiene email propio, solicita primero su cuenta de jugador; si no, pide al club que lo den de alta."
4. Se envía email de aviso al admin.
5. Pantalla de confirmación.

### 4.5. Google OAuth

1. El usuario pulsa "Google".
2. Tras el callback de Google, si el email no está vinculado a un perfil aprobado → redirige a `/login/request?email=...&provider=google`.
3. El formulario es el mismo; el nombre se puede pre-rellenar desde `user.user_metadata.full_name`.
4. Tras aprobar, al volver a entrar con Google se le fuerza a `/change-password` para definir su contraseña propia.

### 4.6. Aprobación por el admin

1. El admin entra a `/admin/access-requests`.
2. Ve listado de solicitudes `pending`.
3. Puede:
   - **Aprobar una**: el sistema crea el `auth.users` con una contraseña aleatoria única, vincula el perfil, inserta el rol y (si es padre) los enlaces a hijos. Pasa a `approved`.
   - **Aprobar en bloque**: misma acción para varias seleccionadas.
   - **Rechazar**: elimina la solicitud.
4. El panel muestra las credenciales emitidas una sola vez y el admin las comunica al usuario por un canal adecuado.

### 4.7. Primer login y activación

1. El usuario entra con su email y la contraseña única que recibió.
2. Si el perfil tiene `must_change_password = true` → `/change-password`.
3. Cambia la contraseña.
4. El sistema marca `profiles.must_change_password = false` y la solicitud pasa a `activated`.

## 5. Modelo de datos

### 5.1. Nueva tabla: `access_requests`

```sql
CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,                       -- email con el que quiere entrar
  full_name text NOT NULL,                   -- nombre completo del solicitante
  role text NOT NULL CHECK (role IN ('player', 'parent', 'coach', 'delegate', 'directiva', 'admin')),
  birth_year smallint,                       -- solo para jugadores
  gender text CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')), -- solo para jugadores
  relation text CHECK (relation IN ('mother', 'father', 'legal_guardian', 'other')), -- solo para padres
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'activated')),
  candidate_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- si un padre logueado solicita para otro (futuro)
  approved_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 5.2. Nueva tabla: `access_request_children`

```sql
CREATE TABLE public.access_request_children (
  request_id uuid NOT NULL REFERENCES public.access_requests(id) ON DELETE CASCADE,
  child_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (request_id, child_profile_id)
);
```

### 5.3. Cambios en tablas existentes

- Eliminar `registration_codes` y todas sus referencias.
- `profiles` no cambia de estructura; se usa `auth_user_id` y `must_change_password` como hasta ahora.
- `parent_child_links` ya soporta la relación; no requiere cambios.

## 6. Pantallas y componentes nuevos

- `/login/request` → selección de rol (jugador / padre).
- `/login/request/player` → formulario de solicitud de jugador.
- `/login/request/parent` → formulario de solicitud de padre con búsqueda de hijos.
- `/admin/access-requests` → panel de gestión.
- Diálogo/mensaje de "solicitud enviada, pendiente de activación".

Se eliminan:

- `/register`
- `/register/onboarding`
- `RegisterForm`
- `GoogleOnboardingForm` (su lógica se integra en los nuevos formularios)
- `registration_codes`

## 7. Server actions necesarias

- `submitAccessRequest(formData)` — valida y crea `access_requests` (+ `access_request_children` si aplica).
- `approveAccessRequest(requestId)` — crea auth user con contraseña única, vincula perfil, asigna rol, enlaza hijos y devuelve la credencial una sola vez.
- `approveAccessRequestsBulk(requestIds[])` — aprobación en bloque.
- `rejectAccessRequest(requestId)` — elimina la solicitud.
- `getAccessRequests(status?)` — listado para el panel admin.
- `searchChildrenProfiles(fullName, birthYear)` — búsqueda exacta de hijos.
- `signIn(formData)` — modificar para redirigir a `/login/request` cuando el email no tenga cuenta.

## 8. Seguridad

- RLS en `access_requests` y `access_request_children`; la creación pública solo pasa por Server Actions validadas.
- Solo admins pueden aprobar/rechazar.
- Rate limiting simple en `submitAccessRequest`: máximo 3 solicitudes por email en 24h y/o IP.
- La contraseña temporal no se persiste en tablas de aplicación y es distinta para cada cuenta.
- El login con la contraseña temporal obliga a cambiarla antes de usar la app.

## 9. Notificaciones

- Email al admin (`galvillo9@gmail.com`) en cada nueva solicitud `pending`.
- No se envía email automático al usuario con la contraseña; el admin se la pasa manualmente.
- Configuración: Resend con variables de entorno `RESEND_API_KEY` y `RESEND_FROM_EMAIL`.

## 10. Decisiones resueltas tras la última aclaración

### 10.1. Menores sin email

**Decisión**: todo jugador que vaya a tener cuenta en la app debe tener un email propio y activar su cuenta. Si es menor y no tiene email, la familia debe crearle uno o usar el email de uno de los padres.

**Implicación técnica**: Supabase Auth no permite dos cuentas con el mismo email. Si el hijo usa el email de uno de los padres, ese padre no podrá crear después su propia cuenta con ese mismo email. El formulario de padre mostrará solo hijos con cuenta **activada** (han cambiado la contraseña). Si un hijo no aparece, se indicará:

> "Tu hijo/a aún no tiene una cuenta activada en el club. Si tiene email propio, solicita primero su cuenta de jugador. Si es menor, créale una cuenta de correo o usa la de uno de los padres."

### 10.2. Alta de un hijo que no existe

El padre no puede dar de alta a un hijo dentro del formulario de padre. Debe existir previamente un perfil de jugador activado. Si no existe, el camino es:

1. Crear una cuenta de correo para el hijo o usar la de un padre.
2. Enviar solicitud de jugador con ese email.
3. Esperar aprobación y activación del hijo.
4. Enviar solicitud de padre vinculando al hijo ya activado.

### 10.3. Credencial de activación única

El panel `/admin/access-requests` muestra al aprobar una credencial aleatoria distinta para cada usuario. La lista puede ocultarse y no puede recuperarse después; si se pierde, se restablece la contraseña desde Supabase Auth.

## 11. Próximos pasos

1. Crear la migración SQL con `access_requests`, `access_request_children` y eliminación de `registration_codes`.
2. Implementar server actions y RLS.
3. Crear las nuevas pantallas de solicitud y el panel de admin.
4. Integrar Resend para el aviso de nuevas solicitudes.
5. Actualizar login, callback de Google y change-password.
6. Tests de integración.
