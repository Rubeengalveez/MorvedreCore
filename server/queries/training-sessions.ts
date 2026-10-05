import type { createClient } from "@/lib/supabase/server";
import type { ManagedTrainingSession } from "@/lib/domain/training-management";

export async function getTrainingSessionsInRange(
  client: Awaited<ReturnType<typeof createClient>>,
  teamIds: string[],
  from: string,
  until: string,
) {
  const sessions: ManagedTrainingSession[] = [];
  for (let offset = 0; offset < 8000; offset += 1000) {
    const { data, error } = await client
      .from("training_sessions")
      .select("*")
      .in("team_id", teamIds)
      .gte("scheduled_at", from)
      .lt("scheduled_at", until)
      .order("scheduled_at")
      .order("id")
      .range(offset, offset + 999);
    if (error) throw new Error("No pudimos cargar los entrenamientos. Vuelve a intentarlo.");
    sessions.push(...data);
    if (data.length < 1000) return sessions;
  }
  throw new Error("Hay demasiados entrenamientos en este periodo. Elige menos fechas o equipos.");
}
