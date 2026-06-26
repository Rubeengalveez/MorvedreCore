const DATE_FMT_LONG = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const DATE_FMT_SHORT = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const DATE_FMT_DAY_MONTH = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
});

const TIME_FMT = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});

const RELATIVE_FMT = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

const WEEKDAY_LETTERS: Record<number, string> = {
  1: "L",
  2: "M",
  3: "X",
  4: "J",
  5: "V",
  6: "S",
  7: "D",
};

const WEEKDAY_NAMES: Record<number, string> = {
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábado",
  7: "domingo",
};

export function formatLongDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return DATE_FMT_LONG.format(d);
}

export function formatShortDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return DATE_FMT_SHORT.format(d);
}

export function formatDayMonth(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return DATE_FMT_DAY_MONTH.format(d);
}

export function formatTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return TIME_FMT.format(d);
}

export function formatDateInput(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateTimeLocal(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  const hh = String(value.getHours()).padStart(2, "0");
  const mm = String(value.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export function parseDateTimeLocal(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatWeekdayLetter(weekday: number): string {
  return WEEKDAY_LETTERS[weekday] ?? "?";
}

export function formatWeekdayName(weekday: number): string {
  return WEEKDAY_NAMES[weekday] ?? "";
}

export function formatWeekdaysList(weekdays: number[]): string {
  return [...weekdays]
    .sort((a, b) => a - b)
    .map((w) => formatWeekdayLetter(w))
    .join(" ");
}

export function formatWeekdaysLong(weekdays: number[]): string {
  return [...weekdays]
    .sort((a, b) => a - b)
    .map((w) => formatWeekdayName(w))
    .join(", ");
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime}–${endTime}`;
}

export function formatRelativeFromNow(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diffMs = d.getTime() - now;
  const diffMin = Math.round(diffMs / 60_000);
  const absMin = Math.abs(diffMin);
  if (absMin < 60) return RELATIVE_FMT.format(diffMin, "minute");
  const diffHours = Math.round(diffMin / 60);
  const absHours = Math.abs(diffHours);
  if (absHours < 24) return RELATIVE_FMT.format(diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  return RELATIVE_FMT.format(diffDays, "day");
}

export function isPast(value: string | Date): boolean {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.getTime() < Date.now();
}
