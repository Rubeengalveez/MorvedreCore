# 16 · Inventario y referencias de código

[Documento general](00-panel-general.md). Inventario del árbol local del 15 de septiembre de 2026. Enumeración no equivale a prueba de cada operación.

## Rutas y componentes administrativos

- `app/(app)/admin/access-requests/_components/access-requests-manager.tsx`
- `app/(app)/admin/access-requests/layout.tsx`
- `app/(app)/admin/access-requests/page.tsx`
- `app/(app)/admin/families/_components/families-manager.tsx`
- `app/(app)/admin/families/layout.tsx`
- `app/(app)/admin/families/page.tsx`
- `app/(app)/admin/layout.tsx`
- `app/(app)/admin/matches/_components/match-form-sheet.tsx`
- `app/(app)/admin/matches/_components/matches-list.tsx`
- `app/(app)/admin/matches/[id]/_components/acta-manager.tsx`
- `app/(app)/admin/matches/[id]/_components/callup-list.tsx`
- `app/(app)/admin/matches/[id]/_components/match-details-form.tsx`
- `app/(app)/admin/matches/[id]/_components/suggest-callup-sheet.tsx`
- `app/(app)/admin/matches/[id]/page.tsx`
- `app/(app)/admin/matches/layout.tsx`
- `app/(app)/admin/matches/page.tsx`
- `app/(app)/admin/news/[id]/page.tsx`
- `app/(app)/admin/news/layout.tsx`
- `app/(app)/admin/news/new/page.tsx`
- `app/(app)/admin/news/page.tsx`
- `app/(app)/admin/page.tsx`
- `app/(app)/admin/players/_components/player-form-sheet.tsx`
- `app/(app)/admin/players/_components/players-table.tsx`
- `app/(app)/admin/players/import/_components/import-players-panel.tsx`
- `app/(app)/admin/players/import/page.tsx`
- `app/(app)/admin/players/layout.tsx`
- `app/(app)/admin/players/page.tsx`
- `app/(app)/admin/seasons/_components/season-form-sheet.tsx`
- `app/(app)/admin/seasons/_components/season-transition-sheet.tsx`
- `app/(app)/admin/seasons/_components/seasons-table.tsx`
- `app/(app)/admin/seasons/layout.tsx`
- `app/(app)/admin/seasons/page.tsx`
- `app/(app)/admin/shop/_components/admin-kanban-card.tsx`
- `app/(app)/admin/shop/_components/shop-editor-form.tsx`
- `app/(app)/admin/shop/layout.tsx`
- `app/(app)/admin/shop/page.tsx`
- `app/(app)/admin/shop/products/[id]/edit/page.tsx`
- `app/(app)/admin/shop/products/new/page.tsx`
- `app/(app)/admin/staff/_components/staff-client.tsx`
- `app/(app)/admin/staff/_components/staff-manager.tsx`
- `app/(app)/admin/staff/layout.tsx`
- `app/(app)/admin/staff/page.tsx`
- `app/(app)/admin/teams/_components/team-form-sheet.tsx`
- `app/(app)/admin/teams/_components/teams-grid.tsx`
- `app/(app)/admin/teams/[id]/_components/roster-manager.tsx`
- `app/(app)/admin/teams/[id]/_components/staff-manager.tsx`
- `app/(app)/admin/teams/[id]/_components/team-edit-sheet.tsx`
- `app/(app)/admin/teams/[id]/page.tsx`
- `app/(app)/admin/teams/layout.tsx`
- `app/(app)/admin/teams/page.tsx`
- `app/(app)/admin/trainings/_components/attendance-sheet.tsx`
- `app/(app)/admin/trainings/_components/cancel-session-sheet.tsx`
- `app/(app)/admin/trainings/_components/training-block-card.tsx`
- `app/(app)/admin/trainings/_components/training-block-form-sheet.tsx`
- `app/(app)/admin/trainings/_components/training-schedule-form-sheet.tsx`
- `app/(app)/admin/trainings/_components/training-sessions-list.tsx`
- `app/(app)/admin/trainings/_components/trainings-list.tsx`
- `app/(app)/admin/trainings/layout.tsx`
- `app/(app)/admin/trainings/page.tsx`
- `app/(app)/admin/treasury/_components/treasury-forms.tsx`
- `app/(app)/admin/treasury/_components/treasury-profile-manager.tsx`
- `app/(app)/admin/treasury/closures/[id]/page.tsx`
- `app/(app)/admin/treasury/layout.tsx`
- `app/(app)/admin/treasury/page.tsx`

## Acciones administrativas exportadas

- `server/actions/admin/availability.ts:52:export async function setAvailability(input: {`
- `server/actions/admin/availability.ts:108:export async function setMyAvailability(input: {`
- `server/actions/admin/import.ts:120:export async function previewImport(formData: FormData): Promise<ImportPreview> {`
- `server/actions/admin/import.ts:132:export async function commitImport(formData: FormData): Promise<ImportResult> {`
- `server/actions/admin/news.ts:41:export async function createNewsPost(input: {`
- `server/actions/admin/news.ts:109:export async function updateNewsPost(input: {`
- `server/actions/admin/news.ts:160:export async function deleteNewsPost(input: { post_id: string }): Promise<void> {`
- `server/actions/admin/news.ts:171:export async function togglePinNews(input: { post_id: string; pinned: boolean }): Promise<void> {`
- `server/actions/admin/news.ts:185:export async function reactToNews(input: {`
- `server/actions/admin/notifications.ts:40:export async function markNotificationRead(notificationId: string): Promise<void> {`
- `server/actions/admin/notifications.ts:56:export async function markAllNotificationsRead(): Promise<void> {`
- `server/actions/admin/notifications.ts:72:export async function getUnreadCount(): Promise<number> {`
- `server/actions/admin/notification-dispatch.ts:15:export async function insertNotificationsWithPush(`
- `server/actions/admin/seasons.ts:24:export async function createSeason(input: {`
- `server/actions/admin/seasons.ts:59:export async function updateSeason(`
- `server/actions/admin/seasons.ts:98:export async function setCurrentSeason(id: string): Promise<void> {`
- `server/actions/admin/seasons.ts:140:export async function archiveSeason(input: {`
- `server/actions/admin/matches.ts:124:export async function createMatch(input: {`
- `server/actions/admin/matches.ts:174:export async function updateMatch(`
- `server/actions/admin/matches.ts:237:export async function deleteMatch(id: string): Promise<void> {`
- `server/actions/admin/matches.ts:259:export async function createCallup(input: {`
- `server/actions/admin/matches.ts:469:export async function createSuggestedCallups(input: unknown): Promise<`
- `server/actions/admin/matches.ts:500:export async function updateCallup(`
- `server/actions/admin/matches.ts:569:export async function setMyCallupStatus(input: {`
- `server/actions/admin/matches.ts:648:export async function deleteCallup(matchId: string, playerId: string): Promise<void> {`
- `server/actions/admin/matches.ts:675:export async function setMatchStatus(`
- `server/actions/admin/matches.ts:717:export async function recordMatchStat(input: {`
- `server/actions/admin/matches.ts:817:export async function saveMatchSheet(input: z.input<typeof saveMatchSheetSchema>): Promise<void> {`
- `server/actions/admin/matches.ts:891:export async function validateMatchStats(matchId: string): Promise<void> {`
- `server/actions/admin/matches.ts:931:export async function suggestCallupForMatch(matchId: string): Promise<CallupSuggestion[]> {`
- `server/actions/admin/matches.ts:1062:export async function suggestCallupForMatchResult(matchId: string): Promise<`
- `server/actions/admin/matches.ts:1076:export async function updateCallupResult(`
- `server/actions/admin/rankings.ts:320:export async function recomputePlayerRanking(playerId: string, seasonId: string): Promise<void> {`
- `server/actions/admin/rankings.ts:334:export async function recomputeSeasonRanking(seasonId: string): Promise<void> {`
- `server/actions/admin/rankings.ts:355:export async function unvalidateMatchStats(matchId: string, reason: string): Promise<void> {`
- `server/actions/admin/rankings.ts:409:export async function recomputeSnapshotForPlayer(`
- `server/actions/admin/rankings.ts:416:export async function recomputeSnapshotsForPlayers(`
- `server/actions/admin/rankings.ts:439:export async function bulkUnvalidateMatchStats(matchIds: string[], reason: string): Promise<void> {`
- `server/actions/admin/players.ts:31:export async function createPlayer(input: {`
- `server/actions/admin/players.ts:87:export async function updatePlayer(`
- `server/actions/admin/players.ts:150:export async function setPlayerActive(input: {`
- `server/actions/admin/players.ts:171:export async function assignToTeam(input: {`
- `server/actions/admin/players.ts:183:export async function removeFromTeam(input: {`
- `server/actions/admin/players.ts:193:export async function linkParentChild(input: {`
- `server/actions/admin/players.ts:308:export async function unlinkParentChild(input: {`
- `server/actions/admin/players.ts:371:export async function assignRole(input: {`
- `server/actions/admin/players.ts:422:export async function unassignRole(input: {`
- `server/actions/admin/players.ts:461:export async function setProfileAdminPermission(input: {`
- `server/actions/admin/shop.ts:100:export async function createShopProduct(input: {`
- `server/actions/admin/shop.ts:178:export async function updateShopProduct(input: {`
- `server/actions/admin/shop.ts:248:export async function deleteShopProduct(input: { product_id: string }): Promise<void> {`
- `server/actions/admin/shop.ts:260:export async function updateShopOrderStatus(input: {`
- `server/actions/admin/shop.ts:318:export async function createShopOrder(input: {`
- `server/actions/admin/shop.ts:547:export async function decideShopOrder(input: {`
- `server/actions/admin/teams.ts:37:export async function createTeam(input: {`
- `server/actions/admin/teams.ts:85:export async function updateTeam(`
- `server/actions/admin/teams.ts:134:export async function assignStaff(input: {`
- `server/actions/admin/teams.ts:193:export async function unassignStaff(input: {`
- `server/actions/admin/teams.ts:242:export async function rosterPlayer(input: {`
- `server/actions/admin/teams.ts:314:export async function unrosterPlayer(input: { team_id: string; player_id: string }): Promise<void> {`
- `server/actions/admin/streaks.ts:185:export async function recomputeStreaksForMatch(`
- `server/actions/admin/streaks.ts:402:export async function recomputeTrainingStreaksForSession(sessionId: string): Promise<void> {`
- `server/actions/admin/streaks.ts:459:export async function recomputeAllStreaks(seasonId: string): Promise<void> {`
- `server/actions/admin/training.ts:46:export async function createTrainingBlock(input: {`
- `server/actions/admin/training.ts:95:export async function createTrainingSchedule(input: {`
- `server/actions/admin/training.ts:262:export async function updateTrainingBlock(`
- `server/actions/admin/training.ts:337:export async function deleteTrainingBlock(id: string): Promise<void> {`
- `server/actions/admin/training.ts:364:export async function generateSessionsFromBlockAction(`
- `server/actions/admin/training.ts:423:export async function resyncFutureTrainingSessionsAction(`
- `server/actions/admin/training.ts:509:export async function cancelTrainingSession(sessionId: string, reason: string): Promise<void> {`
- `server/actions/admin/training.ts:589:export async function uncancelTrainingSession(sessionId: string): Promise<void> {`
- `server/actions/admin/training.ts:626:export async function markAttendance(input: {`
- `server/actions/admin/training.ts:709:export async function markAllPresent(sessionId: string): Promise<{ updated: number }> {`
- `server/actions/admin/treasury.ts:59:export async function upsertTreasuryConcept(input: {`
- `server/actions/admin/treasury.ts:98:export async function assignTreasuryConcept(input: {`
- `server/actions/admin/treasury.ts:126:export async function upsertTreasuryProfileSettings(input: {`
- `server/actions/admin/treasury.ts:158:export async function buildTreasuryPeriodClosure(input: {`
- `server/actions/admin/treasury.ts:304:export async function markTreasuryLinePaid(input: {`
- `server/actions/admin/treasury.ts:334:export async function sendTreasuryClosureEmail(input: {`
- `server/actions/admin/_helpers.ts:47:export async function requireAdmin(): Promise<AdminProfile> {`
- `server/actions/admin/_helpers.ts:67:export async function getAdminAccess(): Promise<AdminCapabilities & { profile: AdminProfile }> {`
- `server/actions/admin/_helpers.ts:113:export async function requirePermission(permission: AdminPermission): Promise<AdminProfile> {`
- `server/actions/admin/_helpers.ts:121:export async function requireAnyPermission(`
- `server/actions/admin/_helpers.ts:131:export async function requireSessionProfile(): Promise<AdminProfile> {`
- `server/actions/admin/_helpers.ts:136:export async function requireCoachOf(teamId: string): Promise<AdminProfile> {`
- `server/actions/admin/_helpers.ts:165:export async function requireMatchStaffOf(teamId: string): Promise<AdminProfile> {`
- `server/actions/admin/_helpers.ts:169:export async function requireTrainingManagerOf(teamId: string): Promise<AdminProfile> {`
- `server/actions/admin/_helpers.ts:173:export async function requireMatchManagerOf(teamId: string): Promise<AdminProfile> {`
- `server/actions/admin/_helpers.ts:188:export async function requireAttendanceManagerOf(teamId: string): Promise<AdminProfile> {`
- `server/actions/admin/_helpers.ts:227:export async function hasAdminAccess(): Promise<boolean> {`

## Evidencias localizables por archivo y línea

- `supabase/migrations/0013_training_attendance.sql:2:  session_id uuid not null references public.training_sessions(id) on delete cascade,`
- `supabase/migrations/0013_training_attendance.sql:3:  player_id uuid not null references public.profiles(id) on delete cascade,`
- `supabase/migrations/0012_training_sessions.sql:3:  block_id uuid references public.training_blocks(id) on delete cascade,`
- `supabase/migrations/0012_training_sessions.sql:4:  team_id uuid not null references public.teams(id) on delete cascade,`
- `server/queries/news.ts:218:    .limit(200);`
- `server/queries/shop.ts:175:  if (error) return [];`
- `server/queries/shop.ts:291:  if (error) return [];`
- `server/queries/shop.ts:311:  if (error) return [];`
- `server/queries/shop.ts:315:export async function getShopOrdersForKanban(statuses: ShopOrderStatus[]): Promise<ShopOrder[]> {`
- `server/queries/shop.ts:322:  if (error) return [];`
- `server/queries/shop.ts:450:    ((profilesData ?? []) as Array<{ id: string; full_name: string }>).map((p) => [`
- `server/actions/admin/training.ts:337:export async function deleteTrainingBlock(id: string): Promise<void> {`
- `server/actions/admin/training.ts:423:export async function resyncFutureTrainingSessionsAction(`
- `server/actions/admin/players.ts:66:      school_enrolled: parsed.data.school_enrolled ?? false,`
- `server/actions/admin/players.ts:67:      school_payment_paid: parsed.data.school_payment_paid ?? false,`
- `server/actions/admin/players.ts:69:      license_active: true,`
- `server/actions/admin/players.ts:70:      is_active: true,`
- `server/actions/admin/players.ts:130:      school_enrolled: parsed.data.school_enrolled ?? false,`
- `server/actions/admin/players.ts:131:      school_payment_paid: parsed.data.school_payment_paid ?? false,`
- `server/actions/auth.ts:84:  birthYear: z.number().int().min(1900).max(new Date().getFullYear()),`
- `server/actions/auth.ts:736:        status: "approved",`
- `server/actions/auth.ts:800:    const result = await approveAccessRequest(fd);`
- `app/(app)/admin/matches/page.tsx:180:          editableTeams.length > 0 ? (`
- `app/(app)/admin/matches/page.tsx:207:        defaultTeamId={defaultTeamId}`
- `app/(app)/admin/families/page.tsx:65:  const profiles = (profilesData ?? []) as PersonOption[];`
- `app/(app)/admin/access-requests/_components/access-requests-manager.tsx:76:      const result = await approveAccessRequest(fd);`
- `app/(app)/admin/access-requests/_components/access-requests-manager.tsx:81:        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r)));`
- `app/(app)/admin/access-requests/_components/access-requests-manager.tsx:105:      const result = await approveAccessRequestsBulk(fd);`
- `app/(app)/admin/access-requests/_components/access-requests-manager.tsx:110:          prev.map((r) => (selected.has(r.id) ? { ...r, status: "approved" } : r)),`
- `app/(app)/admin/matches/_components/matches-list.tsx:162:              role="tab"`
- `app/(app)/admin/page.tsx:75:const ADMIN_MODULES: ReadonlyArray<AdminTile> = [`
- `app/(app)/admin/shop/page.tsx:17:import { getShopOrdersForKanban } from "@/server/queries/shop";`
- `app/(app)/admin/shop/page.tsx:44:  const kanbanStatuses: ShopOrderStatus[] = ["pending_admin", "ordered", "received", "delivered"];`
- `app/(app)/admin/shop/page.tsx:45:  const orders = await getShopOrdersForKanban(kanbanStatuses);`
- `app/(app)/admin/treasury/_components/treasury-forms.tsx:40:              active: true,`
- `app/(app)/admin/treasury/_components/treasury-forms.tsx:127:              active: true,`
- `app/(app)/admin/players/page.tsx:67:  const currentYear = new Date().getFullYear();`
- `app/(app)/admin/players/page.tsx:68:  return ((profilesData ?? []) as Array<Omit<PlayerRow, "currentTeam" | "categoryLabel">>).map(`
- `app/(app)/admin/treasury/page.tsx:77:                      {concept.code} / {concept.periodicity}`
- `app/(app)/admin/treasury/page.tsx:109:                        {closure.line_count} lineas / {closure.status}`
- `app/(app)/admin/staff/page.tsx:99:  const people: PersonOption[] = (profilesData ?? []) as PersonOption[];`
- `app/(app)/admin/players/_components/players-table.tsx:36:  const [localPlayers, setLocalPlayers] = useState(players);`
- `app/(app)/admin/matches/[id]/page.tsx:160:  for (const p of profilesData ?? []) {`
- `app/(app)/admin/matches/[id]/page.tsx:317:                  role="tab"`
- `app/(app)/admin/shop/_components/shop-editor-form.tsx:396:function Field({ label, children }: { label: string; children: React.ReactNode }) {`
- `app/(app)/admin/trainings/_components/training-block-card.tsx:17:  deleteTrainingBlock,`
- `app/(app)/admin/trainings/_components/training-block-card.tsx:85:        await deleteTrainingBlock(block.id);`
- `app/(app)/admin/trainings/_components/training-block-card.tsx:103:        description={`Se borrarán las sesiones futuras de “${block.label}”.`}`
- `app/(app)/admin/teams/[id]/page.tsx:102:          const currentYear = new Date().getFullYear();`
- `app/(app)/admin/shop/_components/admin-kanban-card.tsx:85:  function cancel() {`
- `app/(app)/admin/trainings/_components/trainings-list.tsx:91:            defaultTeamId={defaultTeamId}`
- `app/(app)/admin/trainings/_components/training-block-form-sheet.tsx:39:  resyncFutureTrainingSessionsAction,`
- `app/(app)/admin/trainings/_components/training-block-form-sheet.tsx:98:      ? await resyncFutureTrainingSessionsAction(block.id)`
- `app/(app)/admin/trainings/page.tsx:211:  for (const p of profilesData ?? []) {`
- `app/(app)/admin/trainings/page.tsx:354:              defaultTeamId={defaultTeamId}`
- `app/(app)/admin/trainings/page.tsx:377:        defaultTeamId={defaultTeamId}`

## Dependencias transversales revisadas

- `lib/domain/permissions.ts`
- `server/actions/admin/_helpers.ts`
- `lib/domain/admin-schemas.ts`
- `lib/domain/categories.ts`
- `lib/domain/shop.ts`
- `components/ui/button.tsx`
- `components/ui/input.tsx`
- `components/ui/sheet.tsx`
- `components/ui/page-shell.tsx`
- `components/layout/app-shell.tsx`
- `components/news/news-editor.tsx`
- `server/queries/news.ts`
- `server/queries/shop.ts`
- `supabase/migrations/20260712171403_audit_security_hardening.sql`
- `supabase/migrations/0029_shop.sql`

## Dependencias de otras subaplicaciones

| Función fuera de /admin | Evidencia local | Decisión de integración |
| --- | --- | --- |
| Asistencia e historial | Rutas /attendance y componentes compartidos | Enlazar desde entrenamiento/equipo; evitar segunda implementación |
| Tiempos de natación | server/actions/swim-times.ts contiene crear, editar y anular con requireSwimCoach; entrada por equipo | Revisar descubribilidad desde equipo y respetar permiso específico; no darla por ausente |
| Rankings y rachas | Acciones de recomputación y desvalidación en servidor | Corrección contextual y restringida; no mostrar mantenimiento técnico como tarea diaria |
| Logística | server/actions/travel.ts contiene ofertas, reservas, acompañantes, cancelación y configuración | Gestionar desde el partido y mantener vuelta; ensayos por rol pendientes |
| Notificaciones | Acciones de lectura individual y despacho automatizado | No confundir carpeta admin con un editor de avisos masivos |
| Respaldo y recuperación | Scripts y guía operativa existentes | Supervisión restringida si se necesita; recuperación técnica no se convierte automáticamente en botón para todos |

Estas dependencias están inventariadas para no inventar duplicados ni declarar autosuficiencia total. El detalle de cada subaplicación externa no queda certificado por recorrer /admin.
