# Roadmap de entrega

Plan en fases. Cada fase termina con un **demo funcional** que se puede enseñar a una persona del club para validar.

Estimaciones optimistas. La realidad dirá.

## Fase 0 — Cimientos (1 semana)

> Demo: "Me logueo y veo una pantalla con mi nombre, mi rol y el icono de Morvedre Core"

- [ ] Scaffold del proyecto (Next 15, TS strict, Tailwind v4, shadcn/ui)
- [ ] Setup de Supabase (proyecto + env + tipos generados)
- [ ] `lib/supabase/{client,server,middleware}` + `middleware.ts` de sesión
- [ ] PWA base: manifest.json, service worker con Serwist, iconos placeholder
- [ ] Sistema de diseño: tokens en `globals.css`, paleta, tipografía, escalas
- [ ] Layouts: `(marketing)/layout.tsx` y `(app)/layout.tsx` con shell móvil (sidebar inferior + topbar)
- [ ] Pantalla de login funcional (Supabase Auth, email + password)
- [ ] Pantalla "Mi perfil" (foto, birth_year, cap_number, license_active)
- [ ] Wizard de cambio de contraseña obligatorio en primer login
- [ ] Selector de perfil persistente en la parte superior
- [ ] Bootstrap del primer admin vía script SQL con un email concreto
- [ ] CI básico: GitHub Actions → lint + typecheck + build

## Fase 1 — Estructura deportiva (1 semana)

> Demo: "El admin crea una temporada, los equipos y mete a los jugadores con su año de nacimiento"

- [ ] Migración: tablas `seasons`, `teams`, `team_staff`, `team_rosters`, `profiles`, `user_roles`
- [ ] RLS por rol
- [ ] CRUD Admin: temporadas
- [ ] CRUD Admin: equipos
- [ ] CRUD Admin: alta de jugadores y familias (manual + import Excel)
- [ ] Cálculo automático de categoría visible (sin guardar, derivado)
- [ ] Vista pública de equipo: lista de plantilla con edad y dorsal
- [ ] Asignación de staff (entrenadores, delegados)

## Fase 2 — Entrenamientos y partidos (1.5 semanas)

> Demo: "El entrenador crea el bloque de septiembre, la app genera 30 sesiones, marca asistencia y el delegado mete el acta"

- [ ] Migración: `training_blocks`, `training_sessions`, `training_attendance`, `matches`
- [ ] Creador por bloques (entrenador): genera sesiones en rango de fechas
- [ ] Pantalla de pasar lista ultrarrápida (asumir todos, desmarcar)
- [ ] Calendario de equipo con vista mes / semana / día
- [ ] CRUD partido (admin/entrenador)
- [ ] `match_availability`: bloqueos manuales del jugador
- [ ] **Convocatoria con matriz de ascensos + regla B** (`lib/domain/callups.ts`)
- [ ] Asignación automática de gorro favorito
- [ ] Confirmación RSVP del jugador
- [ ] Notificación push al confirmar convocatoria

## Fase 3 — Estadísticas y rankings (1 semana)

> Demo: "El delegado mete goles y exclusiones tras el partido y los rankings se recalculan"

- [x] Migración: `match_stats`
- [x] Formulario de acta (delegado, ultrarrápido)
- [x] Validación del acta (entrenador)
- [x] Cálculo de rankings (`lib/domain/rankings.ts`) — 34 tests
- [x] Pantalla pública de rankings con filtros (`/rankings`)
- [x] Filtro "ver mi posición aislada" (`MyPositionCard` en `/profile` y `/rankings`)
- [x] Materialización con `ranking_snapshots` y `opponent_stats` (migraciones 0022 y 0023)
- [x] Dashboard reactivo (3 niveles: acción inmediata, tablón, rincón del ego)
- [x] Componentes identitarios: `CapTile`, `PoolScoreboard`, `PichichiPodium`, `Medal`, `LanePattern`
- [x] Bottom nav con tab "Rankings" + pictograma `Trofeo`

## Fase 4 — Noticias y tablón (0.5 semanas)

> Demo: "La directiva publica que la piscina está cerrada, todos reciben push, la gente reacciona"

- [ ] Migración: `news_posts`, `news_reactions`
- [ ] Editor de noticias con markdown y subida de imágenes
- [ ] Feed de noticias con reacciones
- [ ] Fijar noticias importantes
- [ ] Caducidad automática (cron diario)

## Fase 5 — Tienda (1 semana)

> Demo: "El cadete pide una sudadera, el padre aprueba, la encargada ve el pedido en el Kanban"

- [ ] Migración: `shop_products`, `shop_orders`, `shop_order_items`
- [ ] Admin: crear producto con interruptores (talla, personalización)
- [ ] Catálogo público (read-only del estado)
- [ ] Carrito y checkout
- [ ] Flujo "Solicitar a mis padres" con notificación push
- [ ] Aprobación por el padre
- [ ] Panel Kanban: Pendientes / Aprobados / Encargados / Recibidos / Entregados
- [ ] Export a Excel de pedidos agrupados por producto

## Fase 6 — Tesorería (1 semana)

> Demo: "Llega el día 1, pulso 'Generar cierre de mes' y la tesorera recibe un Excel en su email"

- [ ] Migración: `treasury_concepts`, `treasury_period_closures`, `treasury_lines`
- [ ] Admin: definir conceptos tarifarios
- [ ] Asignación de conceptos a perfiles (cuota mensual, descuentos por hermano)
- [ ] Server Action: `buildPeriodClosure` (puro, testeable)
- [ ] Generación de Excel con ExcelJS
- [ ] Envío por Resend al email de tesorería
- [ ] Vista de la familia: "lo que debo este mes"
- [ ] Marcado manual como pagado por la tesorería
- [ ] Cron: recordatorio el día 25 del mes

## Fase 7 — Logística de coches (0.5 semanas)

> Demo: "El delegado activa coches, un padre se ofrece con 3 plazas, los jugadores reservan"

- [ ] Migración: `travel_offers`, `travel_reservations`
- [ ] Toggle "logística activa" en partido visitante
- [ ] Registro de oferta por conductor
- [ ] Reserva de asiento por jugador
- [ ] Vista del delegado: mapa visual de coches
- [ ] Compensación por km configurable en el partido

## Fase 8 — Históricos y leyendas (0.5 semanas)

> Demo: "Pulso 'Iniciar nueva temporada 2026/2027', todo se archiva, y un juvenil de primer año ya no aparece en la lista del infantil"

- [ ] Migración: `historical_player_stats`, `historical_team_matchups`, `audit_log`
- [ ] Server Action: `archiveSeason(seasonId)` (transaccional)
- [ ] Botón admin "Iniciar nueva temporada" con confirmación de seguridad
- [ ] Vista "Leyendas del club": top históricos de goles, partidos, MVPs, asistencia
- [ ] Vista de rivalidades: mejores y peores rivales históricos
- [ ] Recalculo de categorías en bloque

## Fase 9 — Polish, a11y, offline (1 semana)

> Demo: "Lighthouse PWA 95+, WCAG AA, funciona sin conexión en las pantallas de solo lectura"

- [ ] Auditoría accesibilidad (lectores de pantalla, contraste, foco visible)
- [ ] Modo oscuro (opcional, con tokens)
- [ ] Service Worker: cachea dashboard, rankings, calendario
- [ ] Página "Estás sin conexión" con copy útil
- [ ] PWA install prompt personalizado
- [ ] Traducción a valencià (si se decide)
- [ ] Sentry para errores en producción
- [ ] Backup semanal automatizado de la DB a Storage

## Fase 10 — Lanzamiento (1 semana)

> Demo: "El club entero está dado de alta y la app es la fuente oficial de la temporada"

- [ ] Import masivo de jugadores desde Cluber (Excel)
- [ ] Alta de todos los perfiles con contraseñas temporales
- [ ] Onboarding uno a uno con entrenadores y delegados
- [ ] Cartel en la piscina con QR para descarga
- [ ] Documentación interna: "Cómo usar la app" (1 página por rol)
- [ ] Migración de la primera temporada real con datos reales

---

## Riesgos identificados

| Riesgo                                             | Mitigación                                                                                |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Plan free de Supabase se queda corto               | 200 usuarios es trivial para el plan free, monitorear tamaño DB y storage desde día 1     |
| iOS PWA: push notifications limitadas              | Safari aún no soporta push estándar en PWA; fallback in-app + email                       |
| Onboarding de 200 personas:谁来 da de alta a quién | Script SQL de bootstrap + invitación por email en lote                                    |
| Resistencia al cambio (persona de 55 años)         | Sesión presencial + manual visual + botón "ayuda" en cada pantalla                        |
| Padres separados con acceso al hijo                | Soporte multi-tutor en `parent_child_links` (ya previsto)                                 |
| Datos RGPD                                         | Consentimiento firmado antes de primera subida de foto; derecho de supresión implementado |
