import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env", override: false, quiet: true });
dotenv.config({ path: ".env.local", override: true, quiet: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: season, error: seasonErr } = await supabase
    .from("seasons")
    .select("id, label")
    .eq("is_current", true)
    .single();

  if (seasonErr || !season) {
    console.error("Error fetching season:", seasonErr);
    return;
  }

  console.log(`Temporada actual: ${season.label}\n`);

  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id, label, category_code, gender, team_type")
    .eq("season_id", season.id);

  if (teamsErr || !teams) {
    console.error("Error fetching teams:", teamsErr);
    return;
  }

  // Category order
  const order = ["benjamin", "alevin", "infantil", "cadete", "juvenil", "absoluto", "escuela"];
  teams.sort((a, b) => {
    const ia = order.indexOf(a.category_code);
    const ib = order.indexOf(b.category_code);
    if (ia !== ib) return ia - ib;
    return a.label.localeCompare(b.label);
  });

  const allPlayersMap = new Map();

  for (const team of teams) {
    const { data: rosters, error: rosterErr } = await supabase
      .from("team_rosters")
      .select("squad_number, profiles(id, full_name, cap_number, birth_year, gender, is_active)")
      .eq("team_id", team.id)
      .is("left_at", null)
      .order("squad_number");

    if (rosterErr) {
      console.error(`Error fetching roster for ${team.label}:`, rosterErr);
      continue;
    }

    console.log(`### ${team.label} (${team.category_code.toUpperCase()}) — ${rosters?.length ?? 0} jugadores`);
    rosters?.forEach((r, idx) => {
      const p = r.profiles;
      const num = r.squad_number != null ? `#${r.squad_number}` : `[${idx + 1}]`;
      const name = p?.full_name || "Desconocido";
      const year = p?.birth_year ? `(${p.birth_year})` : "";
      console.log(`- ${num.padEnd(5)} ${name} ${year}`);
      if (p) {
        allPlayersMap.set(p.id, { name: p.full_name, year: p.birth_year, team: team.label });
      }
    });
    console.log("");
  }

  console.log(`Total jugadores únicos en plantilla: ${allPlayersMap.size}`);
}

main().catch(console.error);
