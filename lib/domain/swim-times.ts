import { safeInferCategory, type CategoryCode } from "./categories";

export type SwimDistance = 50 | 100;
export type SwimStartType = "water" | "block";
export type SwimRankingMode = "latest" | "best";

export type ParsedSwimTime =
  { ok: true; centiseconds: number; warning: boolean } | { ok: false; message: string };

const MAX_CENTISECONDS = 359_999;

export function normalizeSearchTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-ES")
    .trim()
    .replace(/\s+/g, " ");
}

export function clampDateToSeason(
  date: string,
  season: { start_date: string; end_date: string },
): string {
  if (date < season.start_date) return season.start_date;
  if (date > season.end_date) return season.end_date;
  return date;
}

function validateCs(totalCs: number, distance: SwimDistance): ParsedSwimTime {
  if (!Number.isSafeInteger(totalCs) || totalCs < 1 || totalCs > MAX_CENTISECONDS) {
    return { ok: false, message: "El tiempo debe estar entre 0,01 s y 59:59,99." };
  }
  const warning =
    distance === 50
      ? totalCs < 1800 || totalCs > 18_000
      : totalCs < 4000 || totalCs > 36_000;
  return { ok: true, centiseconds: totalCs, warning };
}

export function parseSwimTime(value: string, distance: SwimDistance): ParsedSwimTime {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, message: "Escribe un tiempo." };

  if (/^(\d+):([0-5]\d)(?:[.,](\d{1,2}))?$/.test(trimmed)) {
    const match = trimmed.match(/^(\d+):([0-5]\d)(?:[.,](\d{1,2}))?$/)!;
    const mins = Number(match[1]);
    const secs = Number(match[2]);
    const rawCs = match[3] ?? "0";
    const cs = Number(rawCs.padEnd(2, "0").slice(0, 2));
    const totalCs = mins * 6000 + secs * 100 + cs;
    return validateCs(totalCs, distance);
  }

  if (distance === 100 && /^(\d{1,2})[.,]([0-5]\d)(?:[.,](\d{1,2}))?$/.test(trimmed)) {
    const match = trimmed.match(/^(\d{1,2})[.,]([0-5]\d)(?:[.,](\d{1,2}))?$/)!;
    const mins = Number(match[1]);
    const secs = Number(match[2]);
    const rawCs = match[3] ?? "0";
    const cs = Number(rawCs.padEnd(2, "0").slice(0, 2));
    const totalCs = mins * 6000 + secs * 100 + cs;
    return validateCs(totalCs, distance);
  }

  if (/^\d{1,3}$/.test(trimmed)) {
    const secs = Number(trimmed);
    const totalCs = secs * 100;
    return validateCs(totalCs, distance);
  }

  if (/^(\d{1,3})[.,](\d{1,2})$/.test(trimmed)) {
    const match = trimmed.match(/^(\d{1,3})[.,](\d{1,2})$/)!;
    const secs = Number(match[1]);
    const cs = Number(match[2].padEnd(2, "0").slice(0, 2));
    const totalCs = secs * 100 + cs;
    return validateCs(totalCs, distance);
  }

  return { ok: false, message: "Usa segundos (ej: 34 o 34,50) o minutos (ej: 1.15 o 1:15)." };
}

export function formatSwimTime(centiseconds: number): string {
  const minutes = Math.floor(centiseconds / 6000);
  const seconds = Math.floor((centiseconds % 6000) / 100);
  const hundredths = centiseconds % 100;
  if (minutes === 0) return `${seconds},${hundredths.toString().padStart(2, "0")} s`;
  return `${minutes}:${seconds.toString().padStart(2, "0")},${hundredths.toString().padStart(2, "0")}`;
}

export function describeSwimTime(centiseconds: number): string {
  const minutes = Math.floor(centiseconds / 6000);
  const seconds = Math.floor((centiseconds % 6000) / 100);
  const hundredths = centiseconds % 100;
  const minutePart = minutes > 0 ? `${minutes} ${minutes === 1 ? "minuto" : "minutos"}` : "";
  const secondPart = `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;

  if (hundredths === 0) {
    if (minutes > 0) return `${minutePart} y ${secondPart}`;
    return secondPart;
  }

  const hundredthPart = `${hundredths} ${hundredths === 1 ? "centésima" : "centésimas"}`;
  if (minutes > 0) {
    return `${minutePart}, ${secondPart} y ${hundredthPart}`;
  }
  return `${secondPart} y ${hundredthPart}`;
}

export interface SwimTimeEntryInput {
  id: string;
  revision: number;
  player_id: string;
  full_name: string;
  photo_url: string | null;
  birth_year: number | null;
  team_id: string;
  team_label: string | null;
  team_color: string | null;
  team_category: CategoryCode;
  season_id: string;
  season_label: string;
  season_end_year: number;
  test_date: string;
  created_at: string;
  start_type: SwimStartType;
  time_50_cs: number | null;
  time_100_cs: number | null;
}

export interface SwimRankingRow {
  id: string;
  position: number;
  player_id: string;
  full_name: string;
  photo_url: string | null;
  category_code: CategoryCode | null;
  team_id: string;
  team_label: string | null;
  team_color: string | null;
  time_cs: number;
  test_date: string;
  season_label: string;
}

export function categoryForSwimEntry(entry: SwimTimeEntryInput): CategoryCode | null {
  if (entry.team_category === "escuela") return "escuela";
  if (entry.birth_year == null) return null;
  return safeInferCategory(entry.birth_year, entry.season_end_year);
}

function timeForDistance(entry: SwimTimeEntryInput, distance: SwimDistance): number | null {
  return distance === 50 ? entry.time_50_cs : entry.time_100_cs;
}

function compareLatest(a: SwimTimeEntryInput, b: SwimTimeEntryInput): number {
  const date = b.test_date.localeCompare(a.test_date);
  if (date !== 0) return date;
  const created = b.created_at.localeCompare(a.created_at);
  if (created !== 0) return created;
  return b.id.localeCompare(a.id);
}

function compareBest(a: SwimTimeEntryInput, b: SwimTimeEntryInput, distance: SwimDistance): number {
  const time =
    (timeForDistance(a, distance) ?? Number.MAX_SAFE_INTEGER) -
    (timeForDistance(b, distance) ?? Number.MAX_SAFE_INTEGER);
  if (time !== 0) return time;
  const date = a.test_date.localeCompare(b.test_date);
  if (date !== 0) return date;
  return a.id.localeCompare(b.id);
}

export function computeSwimRanking(input: {
  entries: SwimTimeEntryInput[];
  distance: SwimDistance;
  mode: SwimRankingMode;
  category?: CategoryCode | null;
  teamId?: string | null;
}): SwimRankingRow[] {
  const eligible = input.entries.filter((entry) => {
    if (timeForDistance(entry, input.distance) == null) return false;
    if (input.teamId && entry.team_id !== input.teamId) return false;
    if (input.category && categoryForSwimEntry(entry) !== input.category) return false;
    return true;
  });

  const byPlayer = new Map<string, SwimTimeEntryInput[]>();
  for (const entry of eligible) {
    const rows = byPlayer.get(entry.player_id) ?? [];
    rows.push(entry);
    byPlayer.set(entry.player_id, rows);
  }

  const selected = [...byPlayer.values()].map((rows) => {
    rows.sort((a, b) =>
      input.mode === "latest" ? compareLatest(a, b) : compareBest(a, b, input.distance),
    );
    return rows[0]!;
  });

  return rankSwimEntries(selected, input.distance);
}

export function computeSwimLegends(input: {
  entries: SwimTimeEntryInput[];
  distance: SwimDistance;
  category?: CategoryCode | null;
  startType: SwimStartType;
}): SwimRankingRow[] {
  const selected = input.entries.filter((entry) => {
    if (timeForDistance(entry, input.distance) == null) return false;
    if (entry.start_type !== input.startType) return false;
    return !input.category || categoryForSwimEntry(entry) === input.category;
  });
  return rankSwimEntries(selected, input.distance);
}

function rankSwimEntries(entries: SwimTimeEntryInput[], distance: SwimDistance): SwimRankingRow[] {
  const sorted = [...entries].sort((a, b) => compareBest(a, b, distance));
  let priorTime: number | null = null;
  let priorPosition = 0;
  return sorted.map((entry, index) => {
    const time = timeForDistance(entry, distance)!;
    const position = time === priorTime ? priorPosition : index + 1;
    priorTime = time;
    priorPosition = position;
    return {
      id: entry.id,
      position,
      player_id: entry.player_id,
      full_name: entry.full_name,
      photo_url: entry.photo_url,
      category_code: categoryForSwimEntry(entry),
      team_id: entry.team_id,
      team_label: entry.team_label,
      team_color: entry.team_color,
      time_cs: time,
      test_date: entry.test_date,
      season_label: entry.season_label,
    };
  });
}

export function madridToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = new Map(parts.map((part) => [part.type, part.value]));
  return `${value.get("year")}-${value.get("month")}-${value.get("day")}`;
}
