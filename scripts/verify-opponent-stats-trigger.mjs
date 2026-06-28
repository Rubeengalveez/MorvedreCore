import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  let testSeasonId = null;
  let testTeamId = null;
  let matchId1 = null;
  let matchId2 = null;

  try {
    console.log("🚀 Starting verification of refresh_opponent_stats trigger...");

    // 1. Create a temporary season
    console.log("\n1. Creating temporary season...");
    const { data: season, error: seasonErr } = await supabase
      .from("seasons")
      .insert({
        label: "TEMP_VERIFY_SEASON",
        start_date: "2026-09-01",
        end_date: "2027-07-31",
        is_current: false,
      })
      .select("id")
      .single();

    if (seasonErr) throw new Error(`Failed to create season: ${seasonErr.message}`);
    testSeasonId = season.id;
    console.log(`✅ Temporary season created with ID: ${testSeasonId}`);

    // 2. Create a temporary team
    console.log("\n2. Creating temporary team...");
    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .insert({
        season_id: testSeasonId,
        category_code: "cadete",
        label: "TEMP_VERIFY_TEAM",
        gender: "male",
      })
      .select("id")
      .single();

    if (teamErr) throw new Error(`Failed to create team: ${teamErr.message}`);
    testTeamId = team.id;
    console.log(`✅ Temporary team created with ID: ${testTeamId}`);

    // 3. Insert first match for TEMP_OPPONENT (played, 3-1 win)
    console.log("\n3. Inserting first match (win 3-1 against TEMP_OPPONENT)...");
    const { data: m1, error: m1Err } = await supabase
      .from("matches")
      .insert({
        season_id: testSeasonId,
        team_id: testTeamId,
        opponent: "TEMP_OPPONENT",
        competition_type: "league",
        is_home: true,
        scheduled_at: new Date().toISOString(),
        status: "played",
        final_score_us: 3,
        final_score_them: 1,
      })
      .select("id")
      .single();

    if (m1Err) throw new Error(`Failed to insert match 1: ${m1Err.message}`);
    matchId1 = m1.id;

    // Verify opponent_stats
    let { data: stats, error: statsErr } = await supabase
      .from("opponent_stats")
      .select("*")
      .eq("season_id", testSeasonId)
      .eq("team_id", testTeamId)
      .eq("opponent", "TEMP_OPPONENT")
      .maybeSingle();

    if (statsErr) throw new Error(`Error fetching stats: ${statsErr.message}`);
    if (!stats) throw new Error("Stats row was not created!");
    
    console.log("Stats row created:", stats);
    if (
      stats.matches_played === 1 &&
      stats.wins === 1 &&
      stats.draws === 0 &&
      stats.losses === 0 &&
      stats.goals_for === 3 &&
      stats.goals_against === 1
    ) {
      console.log("✅ Step 3 PASS: First match correctly initialized opponent stats.");
    } else {
      throw new Error(`Step 3 FAIL: Stats are incorrect. Received: ${JSON.stringify(stats)}`);
    }

    // 4. Insert second match for TEMP_OPPONENT (played, 2-2 draw)
    console.log("\n4. Inserting second match (draw 2-2 against TEMP_OPPONENT)...");
    const { data: m2, error: m2Err } = await supabase
      .from("matches")
      .insert({
        season_id: testSeasonId,
        team_id: testTeamId,
        opponent: "TEMP_OPPONENT",
        competition_type: "league",
        is_home: false,
        scheduled_at: new Date(Date.now() + 86400000).toISOString(), // next day
        status: "played",
        final_score_us: 2,
        final_score_them: 2,
      })
      .select("id")
      .single();

    if (m2Err) throw new Error(`Failed to insert match 2: ${m2Err.message}`);
    matchId2 = m2.id;

    // Verify opponent_stats
    ({ data: stats, error: statsErr } = await supabase
      .from("opponent_stats")
      .select("*")
      .eq("season_id", testSeasonId)
      .eq("team_id", testTeamId)
      .eq("opponent", "TEMP_OPPONENT")
      .maybeSingle());

    if (!stats) throw new Error("Stats row missing after second match!");
    console.log("Stats row updated:", stats);
    if (
      stats.matches_played === 2 &&
      stats.wins === 1 &&
      stats.draws === 1 &&
      stats.losses === 0 &&
      stats.goals_for === 5 &&
      stats.goals_against === 3
    ) {
      console.log("✅ Step 4 PASS: Second match correctly accumulated stats without double-counting.");
    } else {
      throw new Error(`Step 4 FAIL: Stats incorrect after accumulation. Received: ${JSON.stringify(stats)}`);
    }

    // 5. Update second match: reset status to 'cancelled'
    console.log("\n5. Updating second match: change status to 'cancelled'...");
    const { error: upd1Err } = await supabase
      .from("matches")
      .update({ status: "cancelled" })
      .eq("id", matchId2);

    if (upd1Err) throw new Error(`Failed to update match 2 status: ${upd1Err.message}`);

    // Verify opponent_stats
    ({ data: stats, error: statsErr } = await supabase
      .from("opponent_stats")
      .select("*")
      .eq("season_id", testSeasonId)
      .eq("team_id", testTeamId)
      .eq("opponent", "TEMP_OPPONENT")
      .maybeSingle());

    console.log("Stats row after cancellation:", stats);
    if (
      stats &&
      stats.matches_played === 1 &&
      stats.wins === 1 &&
      stats.draws === 0 &&
      stats.losses === 0 &&
      stats.goals_for === 3 &&
      stats.goals_against === 1
    ) {
      console.log("✅ Step 5 PASS: Status reset to non-played correctly subtracted stats.");
    } else {
      throw new Error(`Step 5 FAIL: Stats incorrect after cancellation. Received: ${JSON.stringify(stats)}`);
    }

    // 6. Update second match: status to 'played' and change opponent to TEMP_OPPONENT_2
    console.log("\n6. Updating second match: status back to 'played', change opponent to TEMP_OPPONENT_2...");
    const { error: upd2Err } = await supabase
      .from("matches")
      .update({ status: "played", opponent: "TEMP_OPPONENT_2" })
      .eq("id", matchId2);

    if (upd2Err) throw new Error(`Failed to update match 2 opponent/status: ${upd2Err.message}`);

    // Verify TEMP_OPPONENT
    const { data: stats1, error: stats1Err } = await supabase
      .from("opponent_stats")
      .select("*")
      .eq("season_id", testSeasonId)
      .eq("team_id", testTeamId)
      .eq("opponent", "TEMP_OPPONENT")
      .maybeSingle();

    if (stats1Err) throw new Error(stats1Err.message);
    console.log("TEMP_OPPONENT stats:", stats1);
    if (
      stats1 &&
      stats1.matches_played === 1 &&
      stats1.wins === 1 &&
      stats1.draws === 0 &&
      stats1.goals_for === 3 &&
      stats1.goals_against === 1
    ) {
      console.log("✅ Step 6a PASS: TEMP_OPPONENT stats remain correct.");
    } else {
      throw new Error(`Step 6a FAIL: TEMP_OPPONENT stats incorrect. Received: ${JSON.stringify(stats1)}`);
    }

    // Verify TEMP_OPPONENT_2
    const { data: stats2, error: stats2Err } = await supabase
      .from("opponent_stats")
      .select("*")
      .eq("season_id", testSeasonId)
      .eq("team_id", testTeamId)
      .eq("opponent", "TEMP_OPPONENT_2")
      .maybeSingle();

    if (stats2Err) throw new Error(stats2Err.message);
    console.log("TEMP_OPPONENT_2 stats:", stats2);
    if (
      stats2 &&
      stats2.matches_played === 1 &&
      stats2.wins === 0 &&
      stats2.draws === 1 &&
      stats2.losses === 0 &&
      stats2.goals_for === 2 &&
      stats2.goals_against === 2
    ) {
      console.log("✅ Step 6b PASS: TEMP_OPPONENT_2 stats correctly created.");
    } else {
      throw new Error(`Step 6b FAIL: TEMP_OPPONENT_2 stats incorrect. Received: ${JSON.stringify(stats2)}`);
    }

    // 7. Delete match 1 (TEMP_OPPONENT)
    console.log("\n7. Deleting match 1 (TEMP_OPPONENT)...");
    const { error: del1Err } = await supabase
      .from("matches")
      .delete()
      .eq("id", matchId1);

    if (del1Err) throw new Error(`Failed to delete match 1: ${del1Err.message}`);

    // Verify TEMP_OPPONENT stats deleted
    const { data: statsDel1, error: statsDel1Err } = await supabase
      .from("opponent_stats")
      .select("*")
      .eq("season_id", testSeasonId)
      .eq("team_id", testTeamId)
      .eq("opponent", "TEMP_OPPONENT")
      .maybeSingle();

    if (statsDel1Err) throw new Error(statsDel1Err.message);
    if (statsDel1 === null) {
      console.log("✅ Step 7 PASS: TEMP_OPPONENT stats row deleted after deleting its only match.");
    } else {
      throw new Error(`Step 7 FAIL: TEMP_OPPONENT stats row still exists: ${JSON.stringify(statsDel1)}`);
    }

    // 8. Delete match 2 (TEMP_OPPONENT_2)
    console.log("\n8. Deleting match 2 (TEMP_OPPONENT_2)...");
    const { error: del2Err } = await supabase
      .from("matches")
      .delete()
      .eq("id", matchId2);

    if (del2Err) throw new Error(`Failed to delete match 2: ${del2Err.message}`);

    // Verify TEMP_OPPONENT_2 stats deleted
    const { data: statsDel2, error: statsDel2Err } = await supabase
      .from("opponent_stats")
      .select("*")
      .eq("season_id", testSeasonId)
      .eq("team_id", testTeamId)
      .eq("opponent", "TEMP_OPPONENT_2")
      .maybeSingle();

    if (statsDel2Err) throw new Error(statsDel2Err.message);
    if (statsDel2 === null) {
      console.log("✅ Step 8 PASS: TEMP_OPPONENT_2 stats row deleted after deleting its only match.");
    } else {
      throw new Error(`Step 8 FAIL: TEMP_OPPONENT_2 stats row still exists: ${JSON.stringify(statsDel2)}`);
    }

    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! The refresh_opponent_stats trigger is 100% correct.");

  } catch (err) {
    console.error("\n❌ Verification failed:", err.message);
  } finally {
    // 9. Cleanup temporary season and team
    console.log("\n9. Starting cleanup of temporary data...");
    if (testSeasonId) {
      const { error: cleanErr } = await supabase
        .from("seasons")
        .delete()
        .eq("id", testSeasonId);
      if (cleanErr) {
        console.error(`❌ Cleanup failed: ${cleanErr.message}`);
      } else {
        console.log("🧹 Cleanup completed. Temporary season and cascading rows deleted.");
      }
    }
  }
}

run();
