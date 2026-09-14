import { sheetSchema, type LiveSheet, type LivePlayer } from "./live-match";

export function reconcileLiveRoster(sheet: LiveSheet, current: LivePlayer[]): LiveSheet {
  if (
    !current.length ||
    current.length > 14 ||
    new Set(current.map((p) => p.cap)).size !== current.length ||
    current.some((p) => p.cap < 1 || p.cap > 99)
  )
    throw new Error("Revisa los gorros de la convocatoria: deben ser distintos y válidos.");
  const used = new Set(current.map((p) => p.cap));
  const mapping = new Map<number, number>();
  const players: LivePlayer[] = current.map((p) => ({ ...p, retired: false }));
  for (const old of sheet.players) {
    const replacement = current.find((p) => p.id === old.id);
    if (replacement) {
      mapping.set(old.cap, replacement.cap);
      continue;
    }
    const referenced =
      sheet.events.some((e) => (e.side === "us" && e.cap === old.cap) || e.keeper === old.cap) ||
      sheet.baseline.some((b) => b.cap === old.cap && (b.goals > 0 || b.exclusions > 0)) ||
      sheet.keeperStints?.some((stint) => stint.cap === old.cap);
    if (!referenced) continue;
    let cap = old.cap;
    if (used.has(cap))
      cap = Array.from({ length: 99 }, (_, i) => 99 - i).find((n) => !used.has(n))!;
    used.add(cap);
    players.push({ ...old, cap, retired: true });
    mapping.set(old.cap, cap);
  }
  const remap = (cap: number | null) => (cap === null ? null : (mapping.get(cap) ?? null));
  const pending =
    sheet.pending?.kind === "penalty_shot" &&
    sheet.events.find(
      (e) =>
        e.id === (sheet.pending?.kind === "penalty_shot" ? sheet.pending.penalty_event_id : ""),
    )?.side === "them"
      ? { ...sheet.pending, shooter_cap: remap(sheet.pending.shooter_cap) }
      : sheet.pending;
  const keeperId = sheet.players.find((p) => p.cap === sheet.keeper)?.id;
  return sheetSchema.parse({
    ...sheet,
    players,
    keeper:
      current.find((p) => p.id === keeperId)?.cap ??
      current.find((p) => p.cap === 1 || p.cap === 13)?.cap ??
      null,
    events: sheet.events.map((e) => ({
      ...e,
      cap: e.side === "us" ? remap(e.cap) : e.cap,
      keeper: remap(e.keeper),
    })),
    keeperStints: sheet.keeperStints?.map((stint) => ({ ...stint, cap: mapping.get(stint.cap)! })),
    baseline: sheet.baseline
      .filter((b) => mapping.has(b.cap))
      .map((b) => ({ ...b, cap: mapping.get(b.cap)! })),
    pending,
  });
}
