import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  join(process.cwd(), "app/(app)/admin/trainings/page.tsx"),
  "utf8",
);

describe("admin training query scope", () => {
  it("loads attendance only for sessions in the visible horizon", () => {
    expect(pageSource).toContain('.in("session_id", sessionIds)');
    expect(pageSource).not.toContain(
      'supabase.from("training_attendance").select("session_id, player_id, present, reason")',
    );
  });
});
