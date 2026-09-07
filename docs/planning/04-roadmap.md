# Roadmap de entrega

Plan en fases. Cada fase termina con un **demo funcional** que se puede enseñar a una persona del club para validar.

Estimaciones optimistas. La realidad dirá.

## Fase 0 — Cimientos (1 semana)

> Demo: "Me logueo y veo una pantalla con mi nombre, mi rol y el icono de Morvedre Core"

- [x] Scaffold del proyecto (Next 16, TypeScript strict, Tailwind v4)
- [x] Setup de Supabase (proyecto + entorno + tipos generados)
- [x] Clientes Supabase de navegador, servidor y proxy de sesión
- [x] PWA base: manifiesto, service worker con Serwist e iconos del club
- [x] Sistema de diseño: tokens, paleta, tipografía y escalas
- [x] Layouts de acceso y aplicación con navegación móvil y barra superior
- [x] Login funcional con Supabase Auth
- [x] Perfil con foto, año de nacimiento, dorsal y licencia
- [x] Cambio obligatorio de contraseña en el primer acceso
- [x] Contexto familiar sin suplantación de identidad
- [x] Bootstrap seguro del primer administrador
- [x] CI con lint, tipos, tests y build

## Fase 1 — Estructura deportiva (1 semana)

> Demo: "El admin crea una temporada, los equipos y mete a los jugadores con su año de nacimiento"

- [x] Migración: tablas `seasons`, `teams`, `team_staff`, `team_rosters`, `profiles`, `user_roles`
- [x] RLS por rol y permiso delegado
- [x] CRUD Admin: temporadas
- [x] CRUD Admin: equipos
- [x] Alta de jugadores y familias manual o mediante Excel
- [x] Cálculo automático de categoría visible, sin persistir el resultado
- [x] Vista de equipo con plantilla, edad y dorsal
- [x] Asignación de entrenadores y delegados

## Fase 2 — Entrenamientos y partidos (1.5 semanas)

> Demo: "El entrenador crea el bloque de septiembre, la app genera 30 sesiones, marca asistencia y el delegado mete el acta"

- [x] Migración: `training_blocks`, `training_sessions`, `training_attendance`, `matches`
- [x] Creador por bloques con reemplazo transaccional de sesiones
- [x] Pantalla de asistencia diaria optimizada para piscina
- [x] Calendario con vistas mes, semana y agenda
- [x] CRUD de partidos para administración y staff autorizado
- [x] Disponibilidad manual del jugador y su familia
- [x] Convocatoria con matriz de ascensos y regla B
- [x] Asignación automática de gorro favorito y resolución de conflictos
- [x] Confirmación RSVP del jugador o tutor vinculado
- [x] Notificación in-app, email y push para convocatorias

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

- [x] Migración: `news_posts`, `news_reactions`
- [x] Editor de noticias con Markdown seguro y subida de imágenes
- [x] Feed de noticias con reacciones optimistas
- [x] Noticias destacadas
- [x] Caducidad automática mediante cron

## Fase 5 — Tienda (1 semana)

> Demo: "El cadete pide una sudadera, el padre aprueba, la encargada ve el pedido en el Kanban"

- [x] Migración: `shop_products`, `shop_orders`, `shop_order_items`
- [x] Creación de productos con talla, personalización y fotos
- [x] Catálogo del club
- [x] Carrito y confirmación de pedido
- [x] Solicitud de compra de menores a sus tutores
- [x] Aprobación o rechazo familiar
- [x] Panel Kanban del ciclo completo del pedido
- [x] Exportación a Excel agrupada por producto

## Fase 6 — Tesorería (1 semana)

> Demo: "Llega el día 1, pulso 'Generar cierre de mes' y la tesorera recibe un Excel en su email"

- [x] Migración: `treasury_concepts`, `treasury_period_closures`, `treasury_lines`
- [x] Definición de conceptos tarifarios
- [x] Asignación de cuotas, responsables de cobro y excepciones
- [x] Generación testeada del cierre mensual
- [x] Generación de Excel
- [x] Envío por Resend al email de tesorería
- [x] Vista familiar de importes y pagos
- [x] Marcado manual como pagado
- [x] Recordatorio mensual mediante cron

## Fase 7 — Logística de coches (0.5 semanas)

> Demo: "El delegado activa coches, un padre se ofrece con 3 plazas, los jugadores reservan"

- [x] Migración: `travel_offers`, `travel_reservations`, acompañantes e integridad asociada
- [x] Activación de logística en partidos visitantes
- [x] Oferta de coche por conductor
- [x] Reserva segura de plazas por jugador y acompañante
- [x] Vista operativa de coches para el staff
- [x] Compensación configurable por desplazamiento

## Fase 8 — Históricos y leyendas (0.5 semanas)

> Demo: "Pulso 'Iniciar nueva temporada 2026/2027', todo se archiva, y un juvenil de primer año ya no aparece en la lista del infantil"

- [x] Migración: `historical_player_stats`, `historical_team_matchups`, `audit_log`
- [x] Server Action: `archiveSeason(seasonId)` (transaccional)
- [x] Botón admin "Iniciar nueva temporada" con confirmación de seguridad
- [x] Vista "Leyendas del club": top históricos de goles, partidos, MVPs, asistencia
- [x] Vista de rivalidades: mejores y peores rivales históricos
- [x] Recalculo de categorías en bloque

## Fase 9 — Polish, a11y, offline (1 semana)

> Demo: fallback sin conexión y mejoras de accesibilidad. La conformidad WCAG AA y el rendimiento en móviles reales requieren validación específica; los datos privados no se cachean.

- [x] Auditoría accesibilidad (lectores de pantalla, foco visible :focus-visible, touch targets >= 48px)
- [x] Modo oscuro pospuesto por decisión de diseño; foco en WCAG AA sobre tema piscina
- [x] Service Worker: precache estático y fallback seguro de navegación a /offline
- [x] Página "Estás sin conexión" (/offline) con copy de privacidad y auto-recarga reactiva
- [x] PWA install prompt personalizado con guía modal accesible para iOS y Android
- [x] Decisión de idioma cerrada: exclusivamente en castellano según convención de diseño
- [x] Error boundaries y logging estructurado con redacción de secretos
- [x] Exportador paginado de 41 tablas públicas, checksum, validación remota y bucket privado
- [ ] Ejecución semanal acreditada y ensayo de recuperación integral, incluyendo Auth y archivos

## Fase 10 — Lanzamiento (1 semana)

> Demo: "El club entero está dado de alta y la app es la fuente oficial de la temporada"

- [x] Importador universal de jugadores desde Excel
- [ ] Alta de todos los perfiles con contraseñas temporales
- [ ] Onboarding uno a uno con entrenadores y delegados
- [ ] Cartel en la piscina con QR para descarga
- [x] Documentación interna de una página por rol
- [ ] Migración de la primera temporada real con datos reales

---

## Riesgos identificados

| Riesgo                                 | Mitigación                                                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capacidad del plan gratuito            | Medir uso de base, archivos y tráfico; la cantidad de usuarios por sí sola no garantiza capacidad                                                       |
| Push en móviles                        | Probar dispositivo, modo de instalación y permisos; mantener el buzón dentro de la app                                                                  |
| Alta de todos los miembros             | Repartir la revisión de solicitudes y la importación validada con administración                                                                        |
| Diferencias de experiencia tecnológica | Observar tareas por rol, corregir dudas y usar las guías de una página                                                                                  |
| Varios tutores del mismo hijo          | Verificar vínculos y permisos de cada tutor con `parent_child_links`                                                                                    |
| Privacidad de datos y fotos            | Revisar con el club los procedimientos de autorización, acceso y retirada; no dar por probado un derecho de supresión por la existencia de una pantalla |
