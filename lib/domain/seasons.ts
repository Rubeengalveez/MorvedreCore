export type Season = {
  label: string;
  start: Date;
  end: Date;
};

export function currentSeasonStart(currentYear: number, month: number): Date {
  const startYear = month >= 8 ? currentYear : currentYear - 1;
  return new Date(startYear, 8, 1);
}

export function currentSeasonEnd(currentYear: number, month: number): Date {
  const endYear = month >= 8 ? currentYear + 1 : currentYear;
  return new Date(endYear, 6, 31);
}

export function formatSeasonLabel(start: Date, end: Date): string {
  return `${start.getFullYear()}/${end.getFullYear()}`;
}

export function inferSeasonForDate(date: Date): Season {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = currentSeasonStart(year, month);
  const end = currentSeasonEnd(year, month);
  return { label: formatSeasonLabel(start, end), start, end };
}

export function seasonContainsDate(seasonStart: Date, seasonEnd: Date, date: Date): boolean {
  const t = date.getTime();
  return t >= seasonStart.getTime() && t <= seasonEnd.getTime();
}
