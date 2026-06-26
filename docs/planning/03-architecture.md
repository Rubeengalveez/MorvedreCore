# Arquitectura funcional y modelo de datos

Documento vivo. Empieza con lo imprescindible y se va refinando durante la implementación.

## 1. Reglas de oro

1. **Una sola fuente de verdad** para el rol del usuario: la tabla `user_roles`, consultable con RLS.
2. **El cálculo de categoría nunca se almacena**, se deriva del `birth_year` y la `season` actual.
3. **Toda mutación pasa por Server Action** validada con Zod; nada se hace desde el cliente directo a Supabase salvo realtime.
4. **RLS en TODAS las tablas**, sin excepciones. Lo que el frontend "ve" y "no ve" lo decide la política, no el código de cliente.
5. **El cierre de tesorería es append-only**: una vez generado, no se modifica. Cualquier corrección es un nuevo "ajuste" en el siguiente cierre.
6. **Los históricos son inmutables**: tras "Iniciar nueva temporada", la tabla `historical_stats` solo crece.
7. **Una persona = un `profile_id`**. Los roles se acumulan. Los hijos no son "sub-cuentas", son perfiles distintos enlazados.

## 2. Modelo relacional (PostgreSQL / Supabase)

### 2.1. Identidad

```
auth.users (Supabase managed)
   ↓ 1:1
profiles
   id (uuid, pk)
   auth_user_id (uuid, fk → auth.users, unique)

   -- DATOS PÚBLICOS (visibles para todos los miembros del club)
   full_name (text)
   photo_url (text, nullable)
   birth_year (smallint, nullable)        -- null si no es jugador
   gender (enum: male, female, other, prefer_not_to_say)
   cap_number (smallint, nullable)
   license_active (boolean, default false)

   -- DATOS PRIVADOS (solo el propio usuario, admin, y los coaches del equipo del usuario)
   phone_e164 (text, nullable)
   email_contact (text, nullable)         -- email de contacto distinto al de login

   notes (text, nullable)
   created_at, updated_at

   -- La RLS separa automáticamente: SELECT de la fila entera permitido,
   -- pero policies específicas bloquean phone/email_contact para roles no privilegiados.

user_roles
   profile_id (fk → profiles)
   role (enum: admin, coach, delegate, directiva, parent, player)
   scope_team_id (fk → teams, nullable)   -- ej. coach de Cadete A
   granted_by (fk → profiles)
   granted_at
   pk (profile_id, role, scope_team_id)    -- un coach por equipo, no duplicados

parent_child_links
   parent_profile_id (fk → profiles)
   child_profile_id (fk → profiles)
   relation (enum: mother, father, legal_guardian, other)
   pk (parent_profile_id, child_profile_id)

profile_notification_prefs
   profile_id (fk → profiles)
   notification_type (enum: convocatoria, entrenamiento_cancelado, pedido_pendiente,
                              noticia_fijada, resultado_publicado, cierre_mensual)
   enabled (boolean, default true)
   pk (profile_id, notification_type)
```

### 2.2. Estructura deportiva

> **Nota sobre género** (ver `00-decisions-log.md` 2026-06-26): el club no tiene línea femenina. Los equipos son `mixed` hasta Infantil y `male` desde Cadete en adelante, con la excepción documentada de 4 jugadoras que juegan en Cadete masculino. La matriz de ascensos **no filtra por género**: opera solo con `category_code`. `profiles.gender` se guarda por si más adelante se quieren rankings segregados o se reactiva la línea femenina.

```
seasons
   id (pk)
   label (text, ej. "2025/2026")
   start_date (date)
   end_date (date)
   is_current (boolean)
   -- Solo una season con is_current = true a la vez (índice parcial único)

teams
   id (pk)
   season_id (fk → seasons)
   category_code (enum: benjamin, alevin, infantil, cadete, juvenil, absoluto, escuela)
   label (text, ej. "Cadete A")
   gender (enum: male, female, mixed)
      -- default por categoría en el seed técnico:
      --   benjamin / alevin / infantil → mixed
      --   cadete / juvenil / absoluto → male
      --   escuela → mixed
   team_type (enum: competitive | school, default 'competitive')
   home_pool (text, nullable)
   pk (season_id, id)

team_staff
   team_id (fk → teams)
   profile_id (fk → profiles)
   role (enum: head_coach, assistant_coach, delegate, physical_trainer)
   pk (team_id, profile_id, role)

team_rosters
   team_id (fk → teams)
   player_id (fk → profiles)
   squad_number (smallint, nullable)       -- dorsal del club (no cap)
   joined_at (date)
   left_at (date, nullable)
   pk (team_id, player_id)
```

### 2.3. Entrenamientos

```
training_blocks
   id (pk)
   team_id (fk)
   label (text, ej. "Pretemporada Q1")
   weekdays (smallint[])                  -- [1,3,5] = lunes, miércoles, viernes
   start_date (date)
   end_date (date)
   start_time (time)
   end_time (time)
   location (text)
   kind (enum: water, dry, physical, technical, mixed)
   created_by (fk → profiles)
   is_active (boolean)

training_sessions
   id (pk)
   block_id (fk → training_blocks, nullable)  -- null si fue creada ad-hoc
   team_id (fk)
   scheduled_at (timestamptz)
   duration_minutes (smallint)
   location (text)
   cancelled (boolean, default false)
   cancellation_reason (text, nullable)        -- texto del motivo, según proceso WhatsApp-first
   cancelled_by (fk → profiles, nullable)       -- quién marcó la cancelación
   cancelled_at (timestamptz, nullable)
   notes (text, nullable)

-- Flujo de cancelación (ver 00-decisions-log.md 2026-06-26):
--   1. Aviso inmediato va por WhatsApp (grupo de directiva → grupo del equipo)
--   2. El entrenador (o quien decida) marca la sesión como cancelada en la app
--   3. La app registra cancellation_reason + cancelled_by + cancelled_at
--   4. Opcional: push notification confirmatoria a los jugadores (NO es el canal principal)

training_attendance
   session_id (fk)
   player_id (fk → profiles)
   present (boolean)
   reason (text, nullable)
   marked_at (timestamptz)
   marked_by (fk → profiles)
   pk (session_id, player_id)
```

### 2.4. Partidos y convocatorias

```
matches
   id (pk)
   season_id (fk)
   team_id (fk)
   opponent (text)
   competition_type (enum: league, cup, tournament, friendly)  -- añadido 2026-06-26: el club participa en varias competiciones
   is_home (boolean)
   location (text)
   pool_name (text, nullable)
   scheduled_at (timestamptz)
   call_deadline_at (timestamptz, nullable)
   status (enum: scheduled, in_progress, played, cancelled, postponed)
   logistics_enabled (boolean, default false)
   notes (text, nullable)
   final_score_us (smallint, nullable)
   final_score_them (smallint, nullable)

match_availability
   player_id (fk → profiles)
   date (date)
   available (boolean)
   reason (text, nullable)
   pk (player_id, date)                    -- bloqueos del calendario personal

match_callups
   match_id (fk)
   player_id (fk → profiles)
   cap_number (smallint)
   status (enum: called, confirmed, declined, withdrawn, no_show)
   confirmed_at (timestamptz, nullable)
   source_team_id (fk → teams, nullable)    -- si subió de otro equipo
   pk (match_id, player_id)

match_stats
   match_id (fk)
   player_id (fk → profiles)
   goals (smallint, default 0)
   exclusions (smallint, default 0)
   mvp (boolean, default false)
   entered_by (fk → profiles)
   entered_at (timestamptz)
   validated_by (fk → profiles, nullable)
   validated_at (timestamptz, nullable)
   pk (match_id, player_id)
```

### 2.5. Noticias

```
news_posts
   id (pk)
   author_id (fk → profiles)
   kind (enum: info, urgent, festive, tournament, results, sponsor)
   title (text)
   body_md (text)
   media_urls (text[], default '{}')
   pinned (boolean, default false)
   expires_at (timestamptz, nullable)
   target_audience (enum: all, parents, players, coaches, specific_team)
   target_team_id (fk → teams, nullable)
   created_at (timestamptz)

news_reactions
   post_id (fk)
   profile_id (fk → profiles)
   kind (enum: like, dislike, celebrate, sad)
   pk (post_id, profile_id)
```

### 2.6. Tienda

```
shop_products
   id (pk)
   name (text)
   description (text, nullable)
   base_price_cents (integer)
   image_url (text, nullable)
   requires_size (boolean)
   size_format (enum: letter, number, unique, none)
   size_options (text[], nullable)         -- ['S','M','L'] o ['38','40','42']
   requires_customization (boolean)
   customization_label (text, nullable)     -- ej. "Nombre a estampar"
   active (boolean, default true)
   created_at (timestamptz)

shop_orders
   id (pk)
   season_id (fk)
   requester_id (fk → profiles)              -- quien hizo clic (jugador o padre)
   target_id (fk → profiles)                -- para quién es el pedido
   status (enum: pending_parent, approved, ordered_factory, received, delivered, cancelled)
   parent_approval_by (fk → profiles, nullable)
   parent_approval_at (timestamptz, nullable)
   notes (text, nullable)
   created_at (timestamptz)

shop_order_items
   id (pk)
   order_id (fk)
   product_id (fk → shop_products)
   qty (smallint)
   unit_price_cents (integer)
   size (text, nullable)
   customization (text, nullable)
```

### 2.7. Tesorería

```
treasury_concepts
   id (pk)
   code (text, unique)                       -- 'CUOTA_MENSUAL', 'MATERIAL_2025'
   label (text)
   kind (enum: fee, material, tournament, adjustment, discount)
   periodicity (enum: monthly, seasonal, one_off)
   default_amount_cents (integer, nullable)  -- null si variable
   applies_to (enum: all_players, all_members, specific_role, specific_profile)
   active (boolean, default true)

treasury_period_closures
   id (pk)
   season_id (fk)
   period_label (text, ej. "Octubre 2025")
   period_start (date)
   period_end (date)
   generated_at (timestamptz)
   generated_by (fk → profiles)
   sent_to_email (text, nullable)
   sent_at (timestamptz, nullable)
   status (enum: draft, sent, archived)

treasury_lines
   id (pk)
   closure_id (fk)
   profile_id (fk → profiles)                -- a quién se le imputa
   concept_id (fk)
   description (text)
   amount_cents (integer)                    -- puede ser negativo (descuentos)
   paid (boolean, default false)
   paid_at (date, nullable)
   payment_method (enum: bank_transfer, bizum, cash, other, nullable)
```

### 2.8. Logística

```
travel_offers
   id (pk)
   match_id (fk)
   driver_id (fk → profiles)
   vehicle_label (text, ej. "Familia García — Seat León 1234-ABC")
   seats_total (smallint)
   seats_taken (smallint, default 0)         -- denormalizado, trigger para mantenerlo
   departure_from (text)
   departure_at (timestamptz)
   notes (text, nullable)
   cancelled (boolean, default false)
   created_at (timestamptz)

travel_reservations
   offer_id (fk)
   player_id (fk → profiles)
   created_at (timestamptz)
   cancelled_at (timestamptz, nullable)
   pk (offer_id, player_id)
```

### 2.9. Histórico y auditoría

```
historical_player_stats
   profile_id (fk)
   season_id (fk)
   category_code (enum)
   team_label (text)
   matches_played (smallint)
   matches_called (smallint)
   goals (smallint)
   exclusions (smallint)
   attendance_pct (numeric(5,2))
   mvp_count (smallint)
   archived_at (timestamptz)
   pk (profile_id, season_id)

historical_team_matchups
   id (pk)
   opponent (text)
   matches_played (smallint)
   wins (smallint)
   draws (smallint)
   losses (smallint)
   goals_for (smallint)
   goals_against (smallint)
   last_match_at (date)

audit_log
   id (pk, bigint)
   actor_id (fk → profiles, nullable)        -- null si fue el sistema
   table_name (text)
   row_id (uuid)
   action (enum: insert, update, delete)
   before (jsonb, nullable)
   after (jsonb, nullable)
   created_at (timestamptz)
```

## 3. Funciones de dominio (lógica pura, testeable)

Estas funciones se escriben en `lib/domain/*` y se prueban con Vitest.

### `categories.ts`
- `inferCategory(birthYear, currentYear): CategoryCode`
- Mapeo: diferencia → categoría. Tabla cerrada, configurable vía `categories_config` si se decide.

### `callups.ts`
- `canCallUpTo(playerCategory, teamCategory): boolean`  — la matriz de ascensos
- `applyBRule(player, targetTeam): boolean`             — ¿es del B y vamos a A? bloqueado
- `suggestCallup(teamId, matchId, max=13): CallupSuggestion[]` — filtra disponibles, ordena por cap, sugiere cap_number
- `findConflicts(playerId, scheduledAt): Conflict[]`     — cruza con `match_availability` y `match_callups`

### `rankings.ts`
- `pichichi(seasonId, scope): Ranking[]`                — goles / partidos
- `discipline(seasonId, scope): Ranking[]`              — menor es mejor
- `commitment(seasonId, scope): Ranking[]`              — % asistencia
- `historicalLegends(stat): Ranking[]`                 — suma todas las temporadas

### `treasury.ts`
- `buildPeriodClosure(seasonId, periodStart, periodEnd): ClosureDraft`
- Aplica: cuota mensual × jugadores activos + conceptos del periodo + descuentos por hermano
- `exportClosureToExcel(closureId): Buffer`

### `season.ts`
- `archiveSeason(seasonId): void`  — llamado por "Iniciar nueva temporada"
- Recorre stats, los mueve a `historical_player_stats`
- Resetea contadores actuales
- Recalcula categorías de todos los jugadores

## 4. Seguridad: RLS, sí o sí

Política base (todas las tablas):
- **Admin**: ve y edita todo.
- **Directiva**: lee todo, edita solo tesorería y tienda.
- **Coach**: lee y edita solo en sus `scope_team_id`.
- **Delegate**: lee y edita solo actas de partidos de sus equipos + logística.
- **Player**: lee sus stats, calendario, convocatorias, noticias. Escribe solo RSVP.
- **Parent**: lee y edita lo mismo que sus hijos, más aprueba pedidos y organiza coches.

Las políticas se crean **dentro del SQL de migración**, no en TS, para que sean auditables.

## 5. Notificaciones

- **Push** vía VAPID + Service Worker, sin servidor de colas externo
- Categorías: `convocatoria`, `entrenamiento_cancelado`, `pedido_pendiente`, `noticia_fijada`, `resultado_publicado`
- Preferencia por usuario en `profile_notification_prefs`
- Fallback: si el push falla, se muestra en el centro de notificaciones in-app

## 6. Observabilidad mínima

- Logs de Server Actions en consola estructurados (Vercel los recoge)
- Tabla `audit_log` para mutaciones sensibles (cambios de rol, generación de cierre, baja de jugador)
- Sentry opcional si en algún momento se quiere (free tier: 5k eventos/mes)
