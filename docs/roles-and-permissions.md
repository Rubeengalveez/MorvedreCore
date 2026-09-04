# Arquitectura de Roles, Permisos y Modelo Familiar

> Guía canónica de referencia para la operación en producción de **Morvedre Core**. Define con precisión qué hace cada persona, cada rol y cómo se garantiza la separación de responsabilidades sin mezclar datos deportivos, personales ni financieros.

---

## 1. Principio Fundamental: Modelo Desacoplado

La aplicación distingue estrictamente entre dos conceptos:
1. **Rol Deportivo o Asociativo (`user_roles` y `team_staff`)**: Define la identidad deportiva de la persona en el club (Jugador, Padre/Madre/Tutor, Entrenador, Delegado). Determina a qué equipos pertenece, sus horarios, su calendario y sus convocatorias.
2. **Capacidades o Permisos Modulares (`profile_permissions`)**: Capacidades administrativas que el **Superadmin (Rubén)** asigna individualmente a personas específicas para gestionar parcelas concretas del club (Tesorería, Tienda, Altas y Fichas, etc.).

> [!IMPORTANT]
> Tener un rol en el club (ej: ser Directiva, Entrenador o Delegado) **no otorga acceso indiscriminado** a la administración. Cada módulo administrativo está blindado tanto en la interfaz (Server Components) como en la API y en la base de datos (Row Level Security).

---

## 2. Matriz Operativa de Personas y Roles

### 2.1. Superadministrador: Rubén (`galvillo9@gmail.com`)
* **Roles:** `admin`, `coach` (Cadete B, Juvenil), `player` (Absoluto).
* **Capacidades:**
  * Control absoluto de todas las áreas: temporadas, equipos, jugadores, familias, personal, entrenamientos, partidos, tesorería, noticias y tienda.
  * **Exclusividad:** Es la **única persona** con potestad para conceder o revocar permisos a otros miembros desde `/admin/staff`.
  * Transición y archivado de temporadas (`archiveSeason`).

### 2.2. Entrenadores: Vega (Benjamín), Vitaliy (Alevín, Infantil, Cadete A, Absoluto) y Rubén
* **Rol base:** `coach` (asignado en `team_staff` como `head_coach` o `assistant_coach`).
* **Capacidades deportivas:**
  * **Pase de lista diario:** Acceso global a la sección `/attendance` para pasar y corregir asistencia en **cualquier categoría de la temporada**, permitiendo cobertura mutua si un compañero falta.
  * **Entrenamientos:** Creación y modificación de bloques y sesiones de sus equipos asignados en `/admin/trainings`.
  * **Partidos y Convocatorias:** Creación de partidos, selección de convocados con la matriz de ascensos (`suggestCallup`), registro del borrador del acta y validación final de estadísticas (`/admin/matches/[id]`).
  * **Logística:** Activación de coches y compensación por viaje para sus partidos visitantes.
* **Límites:** No tienen acceso a Tesorería, Tienda, Fichas de familias ni permisos de personal.

### 2.3. Delegados de Equipo
* **Rol base:** `delegate` (asignado en `team_staff` y `user_roles`).
* **Filosofía a pie de piscina:** Operan directamente desde el detalle del partido (`/matches/[id]`), optimizado para móvil en el borde de la piscina.
* **Capacidades deportivas:**
  * **Ajuste de Convocatorias:** Pueden modificar la convocatoria del entrenador (altas de última hora, bajas por indisposición, asignación de gorros).
  * **Acta del Partido:** Rellenan el borrador del acta (goles, expulsiones, MVP).
  * **Cierre del Acta:** Pueden validar y cerrar definitivamente el acta del partido si el entrenador no está presente.
  * **Coches y Desplazamientos:** Coordinan plazas y conductores en `/matches/[id]/travel`.
* **Límites:** **No pasan lista** en entrenamientos ni acceden a módulos administrativos generales (temporadas, tesorería, tienda, etc.).

### 2.4. Tesorería: Mónica
* **Rol base:** `directiva` / `parent`.
* **Permiso modular:** `manage_treasury`.
* **Capacidades:**
  * Configuración de conceptos tarifarios (cuota mensual de 60 €, descuentos de hermano, escuela 100 €).
  * Asignación de exenciones y ajustes individuales por perfil.
  * Generación y regeneración de cierres periódicos mensuales.
  * Marcado manual de recibos como pagados.
  * Descarga del informe oficial en Excel para remesas bancarias.
* **Límites:** No interviene en decisiones deportivas, convocatorias, tienda ni edición de personal.

### 2.5. Tienda: Sol
* **Rol base:** `directiva` / `parent`.
* **Permiso modular:** `manage_shop`.
* **Capacidades:**
  * Gestión del catálogo de productos bajo demanda (tallas, personalizaciones con dorsal/nombre).
  * Panel Kanban de pedidos: *Pendientes de gestión → Aprobados → Encargados a proveedor → Recibidos → Entregados*.
  * Descarga del Excel de pedidos consolidados con tallas y nombres para enviar a fábrica.
* **Límites:** No accede a saldos de tesorería del club ni a información deportiva.

### 2.6. Secretaría / Fichas / Comunicación: Eva
* **Rol base:** `directiva` / `parent`.
* **Permisos modulares:** `manage_players`, `manage_families`, `manage_news`.
* **Capacidades:**
  * Tramitación y aprobación de solicitudes de acceso de nuevos usuarios (`/admin/access-requests`).
  * Mantenimiento de fichas de jugadores y datos de contacto de tutores.
  * Publicación y fijación de noticias y avisos oficiales en el tablón del club.
* **Límites:** No gestiona cuotas de tesorería, pedidos de tienda ni alineaciones deportivas.

---

## 3. Modelo Familiar y Ciclo de Vida: Menores vs Adultos

```
[ Solicitud de Acceso ]
       │
       ▼
[ Menor de Edad (< 18) ] ────────── Cumple 18 años ──────────► [ Jugador Adulto (≥ 18) ]
• Autonomía deportiva (ver, RSVP)                             • Pedidos directos a tienda
• Bloqueo total de importes de cuotas                         • Ve sus cuotas en Tesorería
• Pedido tienda: "Pendiente aprobación padre"                 • Autonomía legal y económica
       ▲                                                             ▲
       │                                                             │
[ Cuenta Tutor / Padre ]                                      [ Cuenta Tutor / Padre ]
• Gestiona y autoriza pedidos tienda                           • Sigue viéndolo como hijo
• Responde RSVP por sus hijos                                  • Consulta deportiva familiar
• Ve la cuota familiar mensual (ambos padres)
```

### 3.1. Cuentas de Menores de Edad (< 18 años)
* **Obligatoriedad:** Todo jugador federado dispone de correo de cuenta (propio o familiar) para acceder a su perfil.
* **Autonomía deportiva:** Puede consultar su equipo, el calendario, los rankings oficiales y marcar su disponibilidad / RSVP para partidos.
* **Protección económica y de compras:**
  * **Tesorería invisible:** Las políticas RLS impiden que un menor lea importes de tesorería, líneas de cobro o saldos.
  * **Veto familiar en compras:** Todo pedido realizado por un menor nace en estado `pending_parent`. No llega a la tienda ni a Sol hasta que un tutor adulto lo autoriza expresamente.

### 3.2. Cuentas de Tutores (Padre / Madre)
* **Identidad unificada:** Los padres conservan siempre su cuenta personal sin suplantar perfiles. El panel "Espacio familiar" reúne a todos sus hijos en una sola vista.
* **Gestión deportiva delegada:** El tutor puede responder el RSVP de cualquiera de sus hijos convocados directamente desde su cuenta.
* **Autorización de compras:** Recibe aviso inmediato ante solicitudes de compra de sus hijos y puede aprobarlas o rechazarlas con un clic.
* **Transparencia en cuotas:** Si un menor tiene dos tutores vinculados (padre y madre), **ambos pueden consultar la cuota mensual** que se pasará al cobro, garantizando máxima claridad.

### 3.3. Transición a Mayor de Edad (Emancipación a los 18 años)
* El sistema deriva la mayoría de edad de forma matemática a partir del `birth_year` y el año de curso.
* **Efectos inmediatos:**
  1. Sus pedidos de tienda pasan directamente a gestión administrativa (`pending_admin`) sin requerir autorización parental.
  2. Obtiene acceso a su propia sección `/treasury` para ver sus cuotas y pagos.
  3. Los padres pueden seguir viéndolo en su panel deportivo como hijo para consultar partidos y estadísticas, pero sin capacidad de veto económico.

---

## 4. Gestión de Permisos desde `/admin/staff`

El Superadmin dispone del componente `PermissionsManager` en `/admin/staff` para activar o desactivar cualquiera de los 9 permisos granulares:

* `manage_teams`: Crear y editar equipos y categorías.
* `manage_players`: Editar fichas y dorsales de jugadores.
* `manage_families`: Vincular y gestionar tutores parentales.
* `manage_treasury`: Generar cierres y gestionar pagos.
* `manage_news`: Publicar y fijar noticias en el tablón.
* `manage_matches`: Crear y editar partidos de competición.
* `manage_trainings`: Gestionar bloques de entrenamiento de piscina.
* `manage_staff`: Conceder y revocar permisos (solo Superadmin).
* `manage_shop`: Gestionar productos y pedidos de material.

Cualquier cambio se aplica en tiempo real mediante Server Actions protegidas con validación Zod y transacciones atómicas.
