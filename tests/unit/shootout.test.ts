import { describe, expect, it } from "vitest";
import { finalScore, playerTotals, score, sheetSchema, shootoutState, type LiveSheet, type Shootout } from "@/lib/domain/live-match";

function tanda(outcomes: Shootout["shots"][number]["outcome"][], firstSide: "us" | "them" = "us"): Shootout {
  return { firstSide, shots: outcomes.map((outcome, i) => ({ id: `20000000-0000-4000-8000-${String(i).padStart(12, "0")}`, side: i % 2 === 0 ? firstSide : firstSide === "us" ? "them" : "us", cap: 1, keeper: 1, outcome })) };
}
function sheet(shootout: Shootout): LiveSheet {
  return { version: 2, players: [{ id: "10000000-0000-4000-8000-000000000001", cap: 1, name: "Jugador" }], opponentCaps: [1], periods: 4, period: 4, phase: "shootout", keeper: 1, events: [], baseline: [{ cap: 1, goals: 7, exclusions: 0 }], baselineThem: 7, shootout };
}
describe("tanda de penaltis", () => {
  it("termina cuando el rival ya no puede alcanzar el marcador", () => {
    expect(shootoutState(tanda(["goal", "out", "goal", "save", "goal", "post"])).winner).toBe("us");
    expect(shootoutState(tanda(["goal", "out", "goal", "save", "goal", "post"], "them")).winner).toBe("them");
  });
  it("espera los dos lanzamientos en muerte súbita", () => {
    const tied = Array(10).fill("goal");
    expect(shootoutState(tanda(tied)).winner).toBeNull();
    expect(shootoutState(tanda([...tied, "goal"])).winner).toBeNull();
    expect(shootoutState(tanda([...tied, "goal", "out"])).winner).toBe("us");
    expect(shootoutState(tanda([...tied, "out", "out"])).winner).toBeNull();
  });
  it("separa el resultado de cuartos, los penaltis y las estadísticas", () => {
    const s = sheet(tanda(["goal", "out", "goal", "save", "goal", "post"]));
    expect(sheetSchema.safeParse({ ...s, phase: "finished" }).success).toBe(true);
    expect(score(s, "us")).toBe(7);
    expect(finalScore(s, "us")).toBe(10);
    expect(finalScore(s, "them")).toBe(7);
    expect(playerTotals(s, "us", 1).goals).toBe(7);
  });
  it("rechaza cerrar sin ganador, turnos repetidos, tiros extra y partido sin empate", () => {
    const s = sheet(tanda(["goal", "goal"]));
    expect(sheetSchema.safeParse({ ...s, phase: "finished" }).success).toBe(false);
    expect(sheetSchema.safeParse({ ...s, baselineThem: 6 }).success).toBe(false);
    expect(sheetSchema.safeParse({ ...s, period: 3 }).success).toBe(false);
    s.shootout!.shots[1].side = "us";
    expect(sheetSchema.safeParse(s).success).toBe(false);
    expect(sheetSchema.safeParse(sheet(tanda(["goal", "out", "goal", "out", "goal", "out", "goal"]))).success).toBe(false);
  });
});
