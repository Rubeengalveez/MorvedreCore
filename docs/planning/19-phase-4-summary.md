# Resumen de Fase 4 — Noticias y tablón

> Estado: **completada, compilando, validada, push a `main`**. Pendiente aplicar la migración 0026 en el dashboard de Supabase cloud.

## Logros

### Base de datos (1 migración nueva)

- `0026_news.sql` (news_posts + news_reactions + función `archive_expired_news`)
- `0027_news_storage.sql` (bucket `news` con RLS)

> Las tablas `news_posts` y `news_reactions` ya existían en la nube antes de la sesión (creadas por un subagente previo). El bucket `news` se creó con `createBucket` desde la API. Las policies de storage (`news_storage_*`) deben aplicarse manualmente desde el SQL Editor.

### Funciones de dominio

- `lib/domain/news.ts` (puro, 100% testeable):
  - `parseTitle`, `parseBody`, `parseExpiresAt` — validación de inputs.
  - `tallyReactions` — cuenta reacciones por tipo y marca las del viewer.
  - `summarizeBody` — extrae texto plano del markdown.
  - `relativeTime` — "hace 2h", "mañana", "en 3d", etc.
  - `isExpired`, `isValidReaction`, `isValidAudience`, `isAudienceTeam`.

### Server actions

- `server/actions/admin/news.ts`:
  - `createNewsPost({ title, body_md, image_url, audience, audience_team_id, pinned, expires_at, imageFile })` — crea post + sube imagen + notifica a todos.
  - `updateNewsPost({ ... })` — edita post + actualiza imagen.
  - `deleteNewsPost({ post_id })` — elimina post.
  - `togglePinNews({ post_id, pinned })` — fija/desfija.
  - `reactToNews({ post_id, reaction })` — toggle de reacción (3 tipos: `like`, `fire`, `thanks`).

### Server queries

- `server/queries/news.ts`:
  - `getNewsFeed({ myProfileId, page, pageSize })` — feed con pinned + recent.
  - `getNewsPost(postId, myProfileId)` — detalle con reacciones del viewer.
  - `getNewsForAdmin()` — lista para gestión.

### Vistas UI

- **`/news` (nueva)**: feed con pinned arriba, lista paginada, empty state, link a gestión si admin.
- **`/news/[id]` (nueva)**: detalle con markdown renderizado + barra de reacciones.
- **`/admin/news` (nueva)**: lista de gestión con pinear/eliminar.
- **`/admin/news/new` (nueva)**: editor con markdown preview, upload de imagen, caducidad opcional.
- **`/admin/news/[id]` (nueva)**: editor para editar.
- **Bottom nav**: añadido tab "Noticias" entre Inicio y Calendario.

### Componentes UI

- `components/ui/markdown.tsx` — renderer seguro con `react-markdown` + `rehype-sanitize` + `remark-gfm`.
- `components/news/news-card.tsx` — card con avatar, reacciones, summary markdown.
- `components/news/news-editor.tsx` — formulario con preview, upload, caducidad, equipos destinatarios.

### Pictograma nuevo

- `components/brand/pictograms/megafone.tsx` — altavoz estilizado para "Noticias".

### Zod schemas

- `createNewsPostSchema`, `updateNewsPostSchema`, `deleteNewsPostSchema`, `togglePinNewsSchema`, `reactNewsSchema` en `lib/domain/admin-schemas.ts`.

## Validación

```
lint:        0 errores, 2 warnings pre-existentes (scripts/seed-ruben.mjs)
typecheck:   0 errores
tests:       419 passed · 22 skipped (441 totales)
build:       29 rutas, 0 errores
```

### Tests nuevos (Fase 4)

| Suite                     | Tests | Cubre                                                                                                                                           |
| ------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/news.test.ts` | 27    | parseTitle, parseBody, parseExpiresAt, isExpired, isValidReaction, isValidAudience, isAudienceTeam, tallyReactions, summarizeBody, relativeTime |

**Total: +27 tests en Fase 4. Total proyecto: 419 tests (22 skip sin env Supabase).**

## Cómo probar

1. **Aplicar migración 0026** (news_posts + news_reactions) y **0027** (policies de storage) en el SQL Editor de Supabase. El SQL consolidado está en `docs/apply-phase-4-migrations.sql` (se genera ejecutando `node scripts/apply-phase4-migrations.mjs` que también crea el bucket `news` automáticamente).
2. Login con una cuenta admin de pruebas configurada fuera del repositorio.
3. Ir a `/news` (bottom nav) → feed con noticias (vacío al inicio).
4. Ir a `/admin/news` → botón "Nueva" → crear noticia con título + cuerpo markdown.
5. Probar pinear (aparece arriba del feed) y reaccionar (3 tipos: me gusta, ánimo, gracias).
6. Probar `/news/[id]` → ver noticia con markdown renderizado.
7. Probar caducidad: editar una noticia y ponerle fecha de caducidad futura → al pasar, la query `archive_expired_news` la despina automáticamente.
8. Verificar que el storage bucket `news` tiene RLS para admin (insert/update/delete) y para todos los autenticados (select).

## Pendiente

- Aplicar migración 0026 y 0027 (policies de storage) en el cloud.
- Push notifications reales (Fase 9 polish).
- Comentarios en noticias (no requeridos, no estaban en el SRS).

## Decisiones de diseño

- **MVP automático** (Fase 3): el jugador con más goles es MVP. En caso de empate, el de menos exclusiones. Si persiste el empate, ambos son MVP.
- **3 tipos de reacciones**: `like` (👍), `fire` (🔥), `thanks` (🙌). Limitado a 3 para no saturar.
- **Audiencia doble**: `club` (todo el club) o `team` (solo un equipo). RLS bloquea el acceso cross-team.
- **Caducidad automática**: campo opcional `expires_at`. Una función `archive_expired_news()` desfija los posts caducados (no los elimina, los mantiene visibles). Se llama desde la query `getNewsFeed` y manualmente.
- **Markdown seguro**: `rehype-sanitize` neutraliza XSS. Componentes custom para `img` (lazy) y `a` (target blank).
- **Bottom nav con 6 tabs**: Inicio, Noticias, Calendario, Rankings, Equipo, Yo. "Tienda" sale del bottom nav (accesible por URL).
- **Editor con preview**: tabs "Editar" / "Vista previa" para ver el markdown renderizado en tiempo real.
