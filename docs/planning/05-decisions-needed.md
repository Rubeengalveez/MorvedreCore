# Decisiones que necesito del club

He dividido las preguntas en **bloques**. El **bloque A** es bloqueante para arrancar el scaffold. El resto lo resolvemos durante la implementación.

---

## BLOQUE A — Para arrancar la Fase 0 (imprescindible)

### A1. Logo

- **A.1.1** ¿Tienes el logo oficial del club en formato digital (SVG/PNG)? Si sí, pásamelo.
- **A.1.2** Si no, ¿genero un isotipo provisional "WM" estilizado en azul mar para empezar? Se reemplaza en cuanto tengas el real.

### A2. Paleta de marca

- **A.2.1** El SRS dice "azules agua". ¿Cuál te encaja?
  - Opción 1 (clásica): Azul profundo #0A2E5C + blanco + gris carbón
  - Opción 2 (piscina): Turquesa #00A3B4 + blanco + gris carbón
  - Opción 3 (mezcla): Azul profundo primario + turquesa de acento
  - Otra (pásame hex concretos)

- **A.2.2** ¿Color de acento? (botón CTA, alertas, estadísticas positivas)
  - Sugerencia: naranja waterpolo #FF6B35 para "acción" / "gol"
  - Sugerencia: verde para "confirmado" / "asistencia"
  - Sugerencia: rojo para "cancelado" / "exclusión"

### A3. Nombre visible de la app

- ¿Qué debe aparecer bajo el icono del móvil?
  - "Morvedre Core" (lo que dijiste)
  - "Club Waterpolo Morvedre" (formal)
  - "WP Morvedre" (corto)
  - Otro

### A4. Idioma

- ¿Solo castellano, o también valencià (catalán) en algunos textos?
  - Si bilingüe: ¿todo traducido o solo lo importante (menú, notificaciones)?

### A5. Bootstrap del primer administrador

- ¿Cómo creamos la cuenta del primer admin?
  - Opción 1: Script SQL que crea un `auth.users` con email concreto y password temporal conocido, que cambiarás al primer login
  - Opción 2: Wizard de instalación la primera vez que se entra a `/admin/setup` con un token de un solo uso
  - ¿Qué email quieres usar?

### A6. Categorías del waterpolo — confirmación

- **A.6.1** ¿La competición es **mixta** o hay **categorías femenina y masculina separadas**? Esto cambia la estructura de `teams.gender`.
- **A.6.2** ¿Cuántos equipos tiene el club esta temporada? (pásame lista: ej. Benjamín mixto, Alevín mixto, Infantil masculino, Cadete A masculino, Cadete B masculino, Juvenil femenino, Absoluto masculino)
- **A.6.3** Tabla de ascensos que pusiste, ¿es la oficial de la Federación Española de Natación (RFEN) o la autonómica (FNCV)? Quiero confirmarlo porque a veces difieren en absolutos.

### A7. RGPD

- **A.7.1** ¿Tienen ya modelo de consentimiento de cesión de datos del menor que firmen los padres al inicio de cada temporada? (Recomendado: subirlo a la app, foto del DNI del menor, etc.)
- **A.7.2** La **foto del jugador** aparece en rankings y actas (accesible para todos los del club). ¿Eso es OK o hay menores en los que los padres prefieran que no se publique la foto?
  - Si hay excepciones, lo modelamos: `profile.photo_visibility` (todos / solo staff / nadie)

---

## BLOQUE B — Para Fase 1 (Estructura deportiva)

### B1. Cuota y tesorería

- **B.1.1** ¿Cuota periódica (mensual) + extras (material, torneos), o cuota única anual por temporada?
- **B.1.2** ¿Cuántos conceptos tarifarios distintos hay? (cuota mensual, cuota entrenadores, material, torneo Elche, etc.)
- **B.1.3** ¿Descuento por tener varios hermanos en el club? ¿Por ser directiva? ¿Por beca?
- **B.1.4** ¿Qué email de la tesorera recibe el Excel del cierre de mes?
- **B.1.5** ¿Cada familia puede ver el detalle de su cuenta dentro de la app, o solo se lo enviáis por email?
- **B.1.6** Métodos de pago que tenéis hoy (Bizum, transferencia, metálico, domiciliación bancaria)

### B2. Compensación de coches

- **B.2.1** ¿Fija por km (ej. 0,15€/km) o variable?
- **B.2.2** ¿Quién la paga: el club o los jugadores que suben al coche?

---

## BLOQUE C — Para Fase 2/3 (Partidos y estadísticas)

### C1. Convocatoria

- **C.1.1** ¿Cuántas horas antes del partido se cierra la convocatoria?
- **C.1.2** ¿Se puede modificar después de publicar? Si sí, ¿hasta cuándo?
- **C.1.3** ¿Quién puede editar la convocatoria después de cerrada: solo admin, o también entrenador?
- **C.1.4** ¿Los no convocados reciben notificación?
- **C.1.5** ¿Hay lista de espera formal (ej. "suplentes")?

### C2. Estadísticas

- **C.2.1** ¿El acta la edita solo el delegado o la tiene que validar el entrenador?
- **C.2.2** ¿Se distinguen tipos de exclusión? (simple, doble, penalti, etc.) o solo total
- **C.2.3** ¿Hay MVP del partido? ¿Y MVP de la jornada?
- **C.2.4** ¿Categorías separadas también en estadísticas? (un Pichichi femenino y uno masculino)

---

## BLOQUE D — Decisiones técnicas que podemos dejar a mi criterio

Estas las decido yo con defaults razonables. Si discrepas con alguna, dímelo:

- **D.1** Next.js 15 + App Router + TypeScript strict
- **D.2** shadcn/ui como base de componentes (accesible, modificable, sin dependencia viva)
- **D.3** Plan gratuito de Supabase + Vercel
- **D.4** PWA con Serwist (sucesor mantenido de next-pwa)
- **D.5** Iconos Lucide
- **D.6** Email transaccional con Resend + React Email
- **D.7** Tests con Vitest (unit) + Playwright (e2e)
- **D.8** ExcelJS para generar el cierre de tesorería
- **D.9** Hosting: Vercel
- **D.10** Dominio: `morvedre-core.vercel.app` provisional; dominio propio cuando me digas cuál
- **D.11** Repositorio Git: GitHub, en privado, una rama `main` con PRs por feature

---

## Cómo responder

Responde en cualquier formato. Si solo tienes respuestas a A1–A7 (las bloqueantes), con eso empezamos. El resto lo vamos cerrando sobre la marcha en cada fase.

Si prefieres, te puedo ir preguntando de 3 en 3 con el botón de opciones múltiples para no escribir parrafadas.
