import { admin, loadBatch, mergeBatch, rand, randInt, pad2, resetRng } from "./base.mjs";
import { randomUUID } from "node:crypto";

const COMPETITION_TYPES = ["league", "cup", "tournament", "friendly"];

const OPPONENTS = [
  "CN Elche", "CN Valencia", "CN Godella", "CN Petrer", "CE Mediterrani",
  "CW Castellon", "Askartza LE", "CN Sabadell Sur", "CN Terrassa", "CN Barcelona",
  "CN Sant Andreu", "CN Rubí", "CE Arenys de Munt", "CN Montjuïc", "CN Sallent",
];

const CALLUP_STATUSES = ["called", "confirmed", "declined", "withdrawn", "no_show"];

async function main() {
  resetRng();
  console.log("[matches] Generando partidos, actas y estadisticas...\n");

  const batch = loadBatch() ?? {};
  const teamIdByLabel = new Map(Object.entries(batch.teamIdByLabel ?? {}));
  const playerIdsByTeam = batch.playerIdByTeamLabel ?? {};
  const coachIdByTeamLabel = new Map(Object.entries(batch.coachIdByTeamLabel ?? {}));

  if (teamIdByLabel.size === 0) {
    console.log("[matches] No hay equipos. Ejecuta primero: node scripts/seed/players.mjs");
    return;
  }

  const { data: seasonRow } = await admin
    .from("seasons")
    .select("id")
    .eq("label", "2025/2026")
    .maybeSingle();
  if (!seasonRow) {
    console.log("[matches] No hay season activa.");
    return;
  }
  const seasonId = seasonRow.id;

  const matchIds = [];
  const now = new Date();
  const seasonStart = new Date("2025-09-15T00:00:00Z");
  const seasonEnd = new Date("2026-06-15T00:00:00Z");

  const weekendDates = [];
  for (let d = new Date(seasonStart); d <= seasonEnd; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 6) weekendDates.push(new Date(d));
  }

  for (const [label, teamId] of teamIdByLabel) {
    if (label === "Escuela") continue;
    const players = (playerIdsByTeam[label] ?? []).map((id) => ({ id }));
    if (players.length < 8) continue;
    const coachId = coachIdByTeamLabel.get(label) ?? null;

    const selectedWeekends = pickEvenlySpaced(weekendDates, 14);
    for (let i = 0; i < selectedWeekends.length; i++) {
      const sat = selectedWeekends[i];
      const opp = OPPONENTS[i % OPPONENTS.length];
      const isHome = (i + label.length) % 2 === 0;
      const hour = matchHourForTeam(label, sat);
      const date = new Date(sat);
      date.setUTCHours(hour, 0, 0, 0);
      const isPast = date < now;
      await createMatch({
        seasonId, teamId, opponent: opp, scheduledAt: date,
        competitionType: "league", isHome, isPast,
        players, coachId, teamLabel: label, matchIds,
      });
    }

    for (let i = 0; i < 2; i++) {
      const sat = selectedWeekends[3 + i * 5] ?? weekendDates[5 + i * 5];
      if (!sat) continue;
      const opp = OPPONENTS[(i + 7) % OPPONENTS.length];
      const isHome = i % 2 === 0;
      const hour = 20;
      const date = new Date(sat);
      date.setUTCHours(hour, 30, 0, 0);
      const isPast = date < now;
      await createMatch({
        seasonId, teamId, opponent: opp, scheduledAt: date,
        competitionType: "cup", isHome, isPast,
        players, coachId, teamLabel: label, matchIds,
      });
    }

    const fri = new Date("2025-09-06T00:00:00Z");
    if (fri < now) {
      await createMatch({
        seasonId, teamId, opponent: OPPONENTS[(label.length * 3) % OPPONENTS.length],
        scheduledAt: new Date(Date.UTC(2025, 8, 6, 11, 0, 0)),
        competitionType: "friendly", isHome: true, isPast: true,
        players, coachId, teamLabel: label, matchIds,
      });
    }
  }

  mergeBatch({ matchIds });
  console.log(`\n[matches] OK! ${matchIds.length} partidos.`);
  console.log("  Siguiente paso: node scripts/seed/news.mjs");
}

function pickEvenlySpaced(arr, n) {
  if (arr.length <= n) return arr;
  const out = [];
  const step = arr.length / n;
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * step)]);
  return out;
}

function matchHourForTeam(label, sat) {
  if (label === "Benjamín") return 9;
  if (label === "Alevín") return 10;
  if (label === "Infantil") return 12;
  if (label === "Cadete A") return 16;
  if (label === "Cadete B") return 17;
  if (label === "Juvenil") return 18;
  return 19;
}

async function createMatch(opts) {
  const { seasonId, teamId, opponent, scheduledAt, competitionType, isHome, isPast, players, coachId, teamLabel, matchIds } = opts;
  const matchId = randomUUID();
  let ourScore = null, theirScore = null;
  if (isPast) {
    ourScore = randInt(3, 14);
    theirScore = randInt(2, 12);
  }
  const { error: mErr } = await admin.from("matches").upsert({
    id: matchId, season_id: seasonId, team_id: teamId,
    opponent, competition_type: competitionType, is_home: isHome,
    location: isHome ? "Piscina Municipal Puerto Sagunto" : `Piscina ${opponent}`,
    pool_name: isHome ? "Piscina 25m" : null,
    scheduled_at: scheduledAt.toISOString().slice(0, 19) + "Z",
    status: isPast ? "played" : "scheduled",
    final_score_us: ourScore, final_score_them: theirScore,
  }, { onConflict: "id" });
  if (mErr) {
    console.error(`  ! Match ${teamLabel} vs ${opponent}: ${mErr.message}`);
    return;
  }
  matchIds.push(matchId);

  const numCallups = Math.min(13, players.length);
  const shuffled = [...players].sort(() => rand() - 0.5).slice(0, numCallups);
  const callups = shuffled.map((p, idx) => {
    let status, confirmedAt = null;
    if (isPast) {
      status = rand() < 0.95 ? "confirmed" : "no_show";
      confirmedAt = scheduledAt.toISOString();
    } else {
      const r = rand();
      if (r < 0.5) { status = "confirmed"; confirmedAt = new Date(Date.now() - 3600000).toISOString(); }
      else if (r < 0.7) status = "declined";
      else status = "called";
    }
    return {
      match_id: matchId, player_id: p.id, cap_number: idx + 1,
      status, confirmed_at: confirmedAt, source_team_id: null,
    };
  });
  const { error: cErr } = await admin.from("match_callups").upsert(callups, { onConflict: "match_id,player_id" });
  if (cErr) console.error(`  ! Callups ${matchId}: ${cErr.message}`);

  if (isPast) {
    let goalsAssigned = 0;
    const stats = shuffled.map((p) => {
      let goals = 0;
      if (rand() < 0.4 && goalsAssigned < ourScore) {
        goals = Math.min(randInt(1, 3), ourScore - goalsAssigned);
        goalsAssigned += goals;
      }
      const exclusions = rand() < 0.3 ? randInt(1, 2) : 0;
      return {
        match_id: matchId, player_id: p.id,
        goals, exclusions, mvp: false,
        entered_by: coachId, entered_at: scheduledAt.toISOString(),
        validated_by: coachId, validated_at: scheduledAt.toISOString(),
      };
    });
    if (goalsAssigned < ourScore) {
      const remain = ourScore - goalsAssigned;
      const last = stats[0];
      if (last) last.goals += remain;
    }
    if (stats.length > 0) {
      const sorted = [...stats].sort((a, b) => b.goals - a.goals);
      if (sorted[0].goals > 0) sorted[0].mvp = true;
      else stats[randInt(0, stats.length - 1)].mvp = true;
    }
    const { error: sErr } = await admin.from("match_stats").upsert(stats, { onConflict: "match_id,player_id" });
    if (sErr) console.error(`  ! Stats ${matchId}: ${sErr.message}`);
  }
}

main().catch((err) => {
  console.error("[matches] FATAL:", err);
  process.exit(1);
});
