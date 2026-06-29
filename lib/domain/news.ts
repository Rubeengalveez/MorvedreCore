export type NewsAudience = "club" | "team";
export type NewsReaction = "like" | "fire" | "thanks";

export const NEWS_REACTIONS: ReadonlyArray<{ id: NewsReaction; emoji: string; label: string }> = [
  { id: "like", emoji: "Me gusta", label: "👍 Me gusta" },
  { id: "fire", emoji: "Ánimo", label: "🔥 Ánimo" },
  { id: "thanks", emoji: "Gracias", label: "🙌 Gracias" },
];

const MAX_TITLE = 120;
const MAX_BODY = 8000;
const MIN_TITLE = 3;
const MIN_BODY = 1;
const MAX_EXPIRE_DAYS = 365;

export interface ParsedTitle {
  ok: boolean;
  error?: string;
  value: string;
}

export function parseTitle(raw: unknown): ParsedTitle {
  if (typeof raw !== "string") return { ok: false, error: "El título debe ser texto.", value: "" };
  const trimmed = raw.trim();
  if (trimmed.length < MIN_TITLE) return { ok: false, error: "El título es demasiado corto.", value: "" };
  if (trimmed.length > MAX_TITLE) return { ok: false, error: `Máximo ${MAX_TITLE} caracteres.`, value: "" };
  return { ok: true, value: trimmed };
}

export function parseBody(raw: unknown): ParsedTitle {
  if (typeof raw !== "string") return { ok: false, error: "El cuerpo debe ser texto.", value: "" };
  const trimmed = raw.trim();
  if (trimmed.length < MIN_BODY) return { ok: false, error: "El cuerpo no puede estar vacío.", value: "" };
  if (trimmed.length > MAX_BODY) return { ok: false, error: `Máximo ${MAX_BODY} caracteres.`, value: "" };
  return { ok: true, value: trimmed };
}

export function parseExpiresAt(raw: unknown): string | null | { error: string } {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "string") return { error: "Fecha inválida." };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { error: "Fecha inválida." };
  const now = new Date();
  if (d.getTime() < now.getTime() - 1000 * 60) {
    return { error: "La caducidad debe ser en el futuro." };
  }
  const maxDate = new Date(now.getTime() + MAX_EXPIRE_DAYS * 86400000);
  if (d.getTime() > maxDate.getTime()) {
    return { error: `La caducidad no puede pasar de ${MAX_EXPIRE_DAYS} días.` };
  }
  return d.toISOString();
}

export function isExpired(expiresAt: string | null, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < now.getTime();
}

export function isAudienceTeam(audience: string, teamId: string | null): boolean {
  return audience === "team" && teamId !== null;
}

export interface ReactionTally {
  reaction: NewsReaction;
  count: number;
  hasMine: boolean;
}

export function tallyReactions(
  reactions: Array<{ reaction: string; profile_id: string }>,
  myProfileId: string | null,
): ReactionTally[] {
  const map = new Map<NewsReaction, { count: number; hasMine: boolean }>();
  for (const r of reactions) {
    if (r.reaction !== "like" && r.reaction !== "fire" && r.reaction !== "thanks") continue;
    const cur = map.get(r.reaction) ?? { count: 0, hasMine: false };
    cur.count += 1;
    if (myProfileId && r.profile_id === myProfileId) cur.hasMine = true;
    map.set(r.reaction, cur);
  }
  return NEWS_REACTIONS.map((meta) => {
    const entry = map.get(meta.id);
    return { reaction: meta.id, count: entry?.count ?? 0, hasMine: entry?.hasMine ?? false };
  });
}

export function isValidReaction(value: unknown): value is NewsReaction {
  return value === "like" || value === "fire" || value === "thanks";
}

export function summarizeBody(md: string, max = 220): string {
  const stripped = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/[*_`>#-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length <= max) return stripped;
  return stripped.slice(0, max - 1).trimEnd() + "…";
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffMs = date.getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const min = 60 * 1000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (abs <= 0 || abs < 30 * 1000) return "ahora mismo";
  if (abs < hr) {
    const n = Math.round(diffMs / min);
    return n < 0 ? `hace ${-n} min` : `en ${n} min`;
  }
  if (abs < day) {
    const n = Math.round(diffMs / hr);
    return n < 0 ? `hace ${-n} h` : `en ${n} h`;
  }
  if (abs < 7 * day) {
    const n = Math.round(diffMs / day);
    return n < 0 ? `hace ${-n} d` : `en ${n} d`;
  }
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function isValidAudience(value: unknown): value is NewsAudience {
  return value === "club" || value === "team";
}

export const NEWS_LIMITS = { MAX_TITLE, MAX_BODY, MAX_EXPIRE_DAYS } as const;
