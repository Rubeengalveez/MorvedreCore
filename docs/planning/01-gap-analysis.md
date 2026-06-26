# Auditoría del SRS — Huecos detectados

Documento de trabajo. No es documentación para el club, es un **insumo para decisiones**.
Marca `[F]` si es bloqueante, `[I]` si es importante pero tiene default razonable, `[C]` si es cosmético.

## 1. Identidad visual y de producto

| # | Hueco | Severidad | Estado |
|---|-------|-----------|--------|
| 1.1 | Logo oficial del club en formato vectorial (SVG/PNG) y versiones para icono PWA (192, 512, maskable) | `[F]` | ✅ Resuelto: `public/brand/logo-original.png`. Optimizar y generar variantes en Fase 0. |
| 1.2 | Paleta exacta de azules (hex), grises, blanco roto, color de acento | `[F]` | ✅ Resuelto: azul profundo `#0A2E5C` + naranja `#FF6B35` + amarillo balón `#F4C430` (del logo) |
| 1.3 | Tipografías corporativas (si existen) o libertad para elegir | `[I]` | ✅ Resuelto: Manrope (display) + Inter (body) + JetBrains Mono (numérico) |
| 1.4 | Nombre de la app tal y como aparece en pantalla e icono | `[F]` | ✅ Resuelto: "Morvedre Core" |
| 1.5 | Idioma: solo castellano, o bilingüe castellano/valencià | `[F]` | ✅ Resuelto: solo castellano |
| 1.6 | Tono de comunicación (formal, cercano, juvenil, mixto) | `[I]` | ✅ Resuelto: cercano y directo, segunda persona |

## 2. Bootstrap y operación del sistema

| # | Hueco | Severidad | Estado |
|---|-------|-----------|--------|
| 2.1 | ¿Cómo se crea el **primer administrador**? | `[F]` | ✅ Resuelto: script SQL con `galvillo9@gmail.com` |
| 2.2 | ¿Panel de configuración inicial? | `[F]` | 🔄 Implementar en Fase 1 (temporada, equipos) |
| 2.3 | Política de contraseñas: longitud mínima, mayúsculas, números, expiración | `[F]` | ⏳ Pendiente decidir en Fase 0 (default sugerido: min 10 chars, sin expiración, sin 2FA en MVP) |
| 2.4 | Recuperación de contraseña | `[F]` | ⏳ Pendiente decidir: solo por email magic link, o admin puede resetear. Default: magic link + admin puede resetear desde panel |
| 2.5 | ¿2FA obligatorio para Admin y Directiva? | `[I]` | ❌ No en MVP. Demasiado fricción para una app de club. |
| 2.6 | Bloqueo de cuenta tras N intentos fallidos | `[I]` | ⏳ Default: no en MVP, Supabase Auth lo gestiona parcialmente |
| 2.7 | Duración de la sesión | `[I]` | ⏳ Default: 7 días persistentes, refresh on activity |

## 3. RGPD y menores (CRÍTICO)

| # | Hueco | Severidad |
|---|-------|-----------|
| 3.1 | ¿Tienen ya un documento de política de privacidad del club? | `[F]` |
| 3.2 | Consentimiento firmado de los padres para tratamiento de datos del menor (LOPDGDD) | `[F]` |
| 3.3 | Foto de perfil del menor: ¿se publica fuera de la app? (rankings, listados) | `[F]` |
| 3.4 | Datos de contacto del menor: ¿se almacenan? ¿cuáles? | `[F]` |
| 3.5 | Derecho de supresión: cuando un jugador se va, ¿qué se conserva? | `[F]` |
| 3.6 | Retención de históricos: ¿cuántas temporadas se guardan estadísticas? | `[I]` |
| 3.7 | Quién es el responsable del tratamiento (RUT) del club | `[I]` |

## 4. Modelo deportivo — huecos en reglas

| # | Hueco | Severidad | Estado |
|---|-------|-----------|--------|
| 4.1 | ¿Hay categoría femenina separada o son mixtas? | `[F]` | ✅ Resuelto: mixto hasta Infantil, masculino desde Cadete (4 chicas juegan en Cadete masculino por excepción) |
| 4.2 | Equipos reales en cada categoría | `[F]` | ✅ Resuelto: 7 equipos competitivos + 1 escuela especial. Entrenadores asignados |
| 4.3 | ¿Un jugador puede militar en dos equipos a la vez? | `[I]` | ⏳ Default: sí, el modelo lo permite (varios `team_rosters` por jugador con fechas no solapadas). Caso borde: se valida con uso real |
| 4.4 | Criterio de asignación A o B | `[I]` | ⏳ Decisión del entrenador, no del sistema. El admin no decide |
| 4.5 | ¿Un entrenador puede serlo de varios equipos? | Confirmar | ✅ Confirmado: Vitaliy lleva 4 equipos, Rubén lleva 2. El modelo polimórfico lo soporta |
| 4.6 | Jugadores sin gorro favorito | `[C]` | ⏳ Default: número asignado por orden de llegada, en la configuración de cada equipo |
| 4.7 | Colisión de número de gorro | `[I]` | ⏳ Default: avisamos al asignar la convocatoria, no bloqueamos. El delegado puede reasignar manualmente |
| 4.8 | Convocatoria: ¿se puede modificar después? | `[F]` | ✅ Resuelto: sí, se puede modificar hasta durante el partido |
| 4.9 | Convocatoria: lista de espera | `[C]` | ⏳ Default: no en MVP. Si hay baja, el entrenador la gestiona manualmente |
| 4.10 | ¿Los no convocados reciben notificación? | `[C]` | ⏳ Default: sí, una notificación genérica "no convocado" para que no esperen |
| 4.11 | Sustituciones de última hora | `[F]` | ⏳ Default: el entrenador edita la convocatoria hasta el inicio del partido. La app registra los cambios en `audit_log` |
| 4.12 | Tipos de sesión | `[C]` | ⏳ Default: un único tipo. Se puede añadir tipos en versión 2 |
| 4.13 | Cancelación de entrenamiento | `[F]` | ⏳ Default: el entrenador marca la sesión como `cancelled` con motivo. Se notifica push a todos los convocados |
| 4.14 | Justificar faltas | `[C]` | ⏳ Default: el jugador puede dejar un motivo, no se penaliza |
| 4.15 | Requisito de asistencia mínima | `[I]` | ⏳ Default: 70% configurable por equipo. Si no se llega, el entrenador ve un aviso en la convocatoria |

## 5. Estadísticas

| # | Hueco | Severidad | Estado |
|---|-------|-----------|--------|
| 5.1 | ¿Quién mete el acta y quién valida? | `[F]` | ✅ Resuelto: solo el delegado, sin validación |
| 5.2 | ¿Se puede editar un acta después? | `[F]` | ⏳ Default: sí, hasta 7 días después. Queda en `audit_log` |
| 5.3 | ¿Qué se cuenta en "exclusiones"? | `[I]` | ⏳ Default: total por partido. Distinción por tipo en versión 2 |
| 5.4 | Distinción fase regular / playoff / copa | `[C]` | ⏳ Default: añadir un campo `match.phase: 'regular' | 'playoff' | 'cup' | 'friendly'`, editable |
| 5.5 | Rankings públicos: ¿opt-out? | `[C]` | ✅ Resuelto: todos los rankings son públicos dentro del club. No hay opt-out |
| 5.6 | "Leyendas del club": ¿ranking histórico? | `[I]` | ⏳ Default: top goleadores histórico + partidos históricos + máximos asistentes. Se construye progresivamente. No hay MVP histórico |

## 6. Tienda

| # | Hueco | Severidad |
|---|-------|-----------|
| 6.1 | Estados del pedido: ¿cuántos y quién los cambia? (sugerido: Pendiente → Solicitado → Aprobado → Encargado → Recibido → Entregado) | `[F]` |
| 6.2 | ¿Quién pone los precios? ¿IVA incluido? | `[F]` |
| 6.3 | ¿Descuentos por hermano, por directiva, por pronto pago? | `[I]` |
| 6.4 | ¿El padre puede cancelar un pedido aprobado? | `[I]` |
| 6.5 | ¿Historial de pedidos del jugador? | `[C]` |
| 6.6 | Aviso al padre de que un pedido caduca (ej. "Tienes 7 días para aprobar") | `[C]` |

## 7. Tesorería

| # | Hueco | Severidad | Estado |
|---|-------|-----------|--------|
| 7.1 | ¿Cuota periódica o pago único? | `[F]` | ✅ Resuelto: mensual por jugador, más la escuela (100€/temporada) |
| 7.2 | ¿Cuántos conceptos tarifarios? | `[F]` | ⏳ Default: cuota base + cuota pequeños (Benjamín/Alevín) + descuentos + extras de tienda. La tesorera configura los importes |
| 7.3 | ¿Beca / exención / descuento familiar? | `[F]` | ⏳ Default: descuento por hermano configurable (importe 0 por defecto hasta que se confirme). El admin o la tesorera aplican descuentos puntuales en cada cierre |
| 7.4 | ¿Quién ve el cierre? | `[F]` | ⏳ Default: cada familia ve su desglose en la app; la tesorera ve todos y se le envía por email el Excel completo |
| 7.5 | ¿Cómo se marca como pagado? | `[F]` | ⏳ Default: la tesorera marca manualmente cada línea. La familia ve "pagado" / "pendiente" |
| 7.6 | ¿Pago parcial permitido? | `[C]` | ⏳ Default: no en MVP. La tesorera puede hacer un ajuste negativo en el siguiente cierre |
| 7.7 | Auditoría | `[I]` | ⏳ Default: tabla `audit_log` registra cambios en `treasury_concepts` y `treasury_lines` |

## 8. Logística de coches

| # | Hueco | Severidad | Estado |
|---|-------|-----------|--------|
| 8.1 | Compensación por km | `[F]` | ⏳ Default: fija por viaje (no por km). El delegado del partido fija la cantidad. Default sugerido: 30€ |
| 8.2 | Plazas máximas por vehículo | `[C]` | ⏳ Default: el conductor indica hasta 6 plazas |
| 8.3 | Punto de encuentro y hora | `[C]` | ⏳ Default: lo define el conductor, visible para los que reservan |
| 8.4 | ¿El conductor ve qué jugador reserva? | `[C]` | ⏳ Default: sí, ve nombre y foto. El conductor es un padre, no un extraño |
| 8.5 | Cancelación de reserva | `[C]` | ⏳ Default: el jugador puede anular hasta 24h antes del partido. Después, llamar al conductor |

## 9. Noticiario

| # | Hueco | Severidad |
|---|-------|-----------|
| 9.1 | Tipos: informativo, urgente, festivo, torneo, resultados | `[I]` |
| 9.2 | Multimedios: ¿solo texto, o también fotos/vídeos? (afecta storage) | `[I]` |
| 9.3 | Caducidad automática de noticias | `[C]` |
| 9.4 | Fijar noticias importantes al tablón | `[C]` |
| 9.5 | Comentarios o solo reacciones (me gusta / no me gusta) | `[I]` |

## 10. Operación / mantenimiento

| # | Hueco | Severidad | Estado |
|---|-------|-----------|--------|
| 10.1 | Plan de backup de Supabase | `[I]` | ⏳ Cron semanal exportando dump a Storage |
| 10.2 | Entornos: dev / staging / prod | `[I]` | ⏳ Default: dev local + Supabase local con `supabase` CLI, preview en Vercel por PR, prod = rama main |
| 10.3 | Política de soporte | `[I]` | ✅ Resuelto: Rubén (admin total) es el único técnico. Hay que documentar bien y dejar el código limpio |
| 10.4 | Migración desde Cluber | `[I]` | ✅ N/A. El club nunca usó Cluber. Empezamos de cero |
| 10.5 | Naming del repo | `[C]` | ⏳ Default: `morvedre-core`, monorepo simple (solo Next.js) |

## 11. Decisiones técnicas por confirmar (defaults razonables ya pensados)

Todas estas las marco con default; las revisitamos si el usuario discrepa:

- **Next.js 15** con App Router, **TypeScript strict**
- **Tailwind v4** + **shadcn/ui** (componentes accesibles, no opinionados visualmente)
- **Supabase** con **RLS** (Row Level Security) activado en todas las tablas
- **Serwist** (sucesor mantenido de next-pwa) para Service Worker
- **Zod** + **React Hook Form** para formularios
- **TanStack Table** para tablas (rankings, listados)
- **date-fns** para fechas, en zona horaria Europe/Madrid
- **ExcelJS** para generar el Excel de cierre
- **Resend** + **React Email** para los emails transaccionales
- **Vitest** (unit) + **Playwright** (e2e) para testing
- **Vercel** para hosting (cron jobs incluidos para tareas de temporada)
- **ESLint** + **Prettier** + **Husky** + **lint-staged**
- **Lucide** para iconos

## 12. Modelo de datos — tablas a diseñar

(Avance. El diseño fino va en `03-architecture.md`)

- `seasons` (id, label, start_date, end_date, is_current)
- `profiles` (id, auth_user_id, full_name, photo_url, birth_year, cap_number, license_active, phone, must_change_password)
- `user_roles` (profile_id, role, scope_team_id nullable) — polimórfico, una persona puede tener varios
- `parent_child_links` (parent_profile_id, child_profile_id, relation) — un padre puede tener varios hijos, un hijo varios padres
- `teams` (id, season_id, category_code, label — ej. "Cadete A")
- `team_staff` (team_id, profile_id, role — head_coach, assistant, delegate)
- `team_rosters` (team_id, profile_id) — a qué equipo "milita" el jugador
- `training_blocks` (id, team_id, weekdays, start_date, end_date, start_time, end_time, location)
- `training_sessions` (id, block_id, date, cancelled)
- `training_attendance` (session_id, player_id, present, reason)
- `matches` (id, season_id, team_id, opponent, is_home, location, scheduled_at, status, logistics_enabled)
- `match_callups` (match_id, player_id, cap_number, status, called_up_at, withdrawn_at)
- `match_availability` (player_id, date, available, reason) — bloqueos manuales del calendario
- `match_stats` (match_id, player_id, goals, exclusions, validated_by, validated_at)
- `news_posts` (id, author_id, type, title, body, media_urls, pinned, expires_at, created_at)
- `news_reactions` (post_id, profile_id, kind)
- `shop_products` (id, name, description, base_price, requires_size, size_format, requires_customization, customization_label, image_url, active)
- `shop_orders` (id, season_id, requester_id, requester_target_id — perfil para el que se pide, status, parent_approval_by, parent_approval_at)
- `shop_order_items` (order_id, product_id, size, customization, qty, unit_price)
- `treasury_concepts` (id, code, label, kind — cuota | extra | descuento | material, default_amount, applies_to)
- `treasury_period_closures` (id, season_id, period_label, generated_at, total_due_cents, sent_via_resend_to)
- `treasury_lines` (closure_id, profile_id, concept_id, amount_cents, description)
- `travel_offers` (id, match_id, driver_id, vehicle_desc, seats_total, departure_from, departure_at, notes)
- `travel_reservations` (offer_id, player_id, created_at, cancelled_at)
- `historical_stats` (id, profile_id, season_id, category_code, team_label, matches_played, goals, exclusions, attendance_pct)
- `historical_matchups` (id, opponent, matches_played, wins, draws, losses, goals_for, goals_against) — para rivalidades
- `audit_log` (id, actor_id, table, row_id, action, before, after, created_at)

## 13. Lo que NO está en el SRS y merece estar

- **Centro de notificaciones**: icono de campana con inbox, distinto del push
- **Búsqueda global**: buscador en el header para encontrar jugador, equipo, partido
- **Modo "ver como otro usuario"** para admin: para depurar permisos sin pedirle al usuario que cierre sesión
- **Página pública `/equipos/[slug]`** para que los padres vean resultados sin loguearse (opcional)
- **Calendario personal del jugador en formato iCal** (.ics) para sincronizar con Google Calendar
- **Onboarding por tipo de usuario**: el primer wizard de un jugador cadete no es el mismo que el de un tesorero
- **Estados vacíos intencionados**: si no hay entrenamientos, mostrar mensaje motivador en vez de pantalla en blanco
- **Modo oscuro**: para los mayores, opcional, pero barato de implementar bien con tokens
- **Pictogramas de exclusión / gol / MVP** en la app: gamificación visual para los pequeños
