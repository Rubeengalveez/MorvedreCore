export const EVENT_COLORS = {
  training: {
    scheduled: "var(--pool-blue)",
    cancelled: "var(--danger)",
    past: "var(--success)",
    past_cancelled: "var(--danger)",
    unavailable: "var(--ink-300)",
  },
  match: {
    league: "var(--ball-gold)",
    cup: "var(--ball-gold)",
    tournament: "var(--brand-action)",
    friendly: "var(--pool-teal)",
    scheduled: "var(--ball-gold)",
    in_progress: "var(--brand-action)",
    played: "var(--success)",
    cancelled: "var(--danger)",
    postponed: "var(--ink-300)",
    unavailable: "var(--ink-300)",
  },
} as const;

export type EventColorToken = string;

export function trainingColor(input: {
  cancelled: boolean;
  isPast: boolean;
  unavailable: boolean;
}): EventColorToken {
  if (input.unavailable) return EVENT_COLORS.training.unavailable;
  if (input.cancelled && input.isPast) return EVENT_COLORS.training.past_cancelled;
  if (input.cancelled) return EVENT_COLORS.training.cancelled;
  if (input.isPast) return EVENT_COLORS.training.past;
  return EVENT_COLORS.training.scheduled;
}

export function matchColor(input: {
  competitionType: string;
  status: string;
  isPast: boolean;
  unavailable: boolean;
}): EventColorToken {
  if (input.unavailable) return EVENT_COLORS.match.unavailable;
  if (input.status === "cancelled") return EVENT_COLORS.match.cancelled;
  if (input.status === "postponed") return EVENT_COLORS.match.postponed;
  if (input.status === "in_progress") return EVENT_COLORS.match.in_progress;
  if (input.status === "played" || input.isPast) return EVENT_COLORS.match.played;
  if (input.competitionType === "tournament") return EVENT_COLORS.match.tournament;
  if (input.competitionType === "friendly") return EVENT_COLORS.match.friendly;
  if (input.competitionType === "cup") return EVENT_COLORS.match.cup;
  return EVENT_COLORS.match.league;
}
