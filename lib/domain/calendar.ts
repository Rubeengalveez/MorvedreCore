const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEKDAYS_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

const WEEKDAYS_LONG = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export interface YearMonth {
  year: number;
  month: number;
}

export interface MonthCell extends YearMonth {
  day: number;
  iso: string;
  weekdayMonFirst: number;
  inMonth: boolean;
  date: Date;
}

export function monthLabel({ year, month }: YearMonth): string {
  const name = MONTHS_ES[month] ?? "";
  return `${name} ${year}`;
}

export function weekdayShort(weekdayMonFirst: number): string {
  return WEEKDAYS_SHORT[weekdayMonFirst - 1] ?? "";
}

export function weekdayLong(weekdayMonFirst: number): string {
  return WEEKDAYS_LONG[weekdayMonFirst - 1] ?? "";
}

export function addMonths(ym: YearMonth, delta: number): YearMonth {
  const d = new Date(ym.year, ym.month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function isoDateFromYMD(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

export function isoDateFromDate(date: Date): string {
  return isoDateFromYMD(date.getFullYear(), date.getMonth(), date.getDate());
}

export function weekdayMonFirst(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function getMonthCells(year: number, month: number): MonthCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = weekdayMonFirst(firstOfMonth);
  const total = daysInMonth(year, month);

  const start = new Date(year, month, 1 - (firstWeekday - 1));
  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
      iso: isoDateFromDate(d),
      weekdayMonFirst: weekdayMonFirst(d),
      inMonth: d.getMonth() === month && d.getFullYear() === year,
      date: d,
    });
  }
  void total;
  return cells;
}

export function getNext30Days(from: Date): Date[] {
  const out: Date[] = [];
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < 30; i++) {
    out.push(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i));
  }
  return out;
}

export function formatTimeOfDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatLongDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const weekday = WEEKDAYS_LONG[d.getDay() === 0 ? 6 : d.getDay() - 1] ?? "";
  const day = d.getDate();
  const month = MONTHS_ES[d.getMonth()] ?? "";
  return `${weekday} ${day} de ${month}`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffSec = Math.floor((now.getTime() - then) / 1000);
  if (diffSec < 60) return "ahora mismo";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `hace ${diffD} d`;
  const diffW = Math.floor(diffD / 7);
  if (diffW < 4) return `hace ${diffW} sem`;
  const diffMo = Math.floor(diffD / 30);
  if (diffMo < 12) return `hace ${diffMo} mes${diffMo === 1 ? "" : "es"}`;
  const diffY = Math.floor(diffD / 365);
  return `hace ${diffY} año${diffY === 1 ? "" : "s"}`;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function todayIso(): string {
  return isoDateFromDate(new Date());
}

export function addDaysIso(startIso: string, days: number): string {
  const [y, m, d] = startIso.split("-").map(Number);
  if (y == null || m == null || d == null) return startIso;
  const next = new Date(y, m - 1, d + days);
  return isoDateFromDate(next);
}

export function currentYearMonth(): YearMonth {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() };
}
