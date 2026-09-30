import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ActaShootout } from "@/components/matches/acta-shootout";
import type { LiveRecord, LiveSheet } from "@/lib/domain/live-match";

afterEach(cleanup);

it("permite turnos consecutivos de ambos equipos sin duplicar un lanzamiento", async () => {
  const initial: LiveRecord = {
    matchId: "00000000-0000-4000-8000-000000000801",
    owner: "00000000-0000-4000-8000-000000000901",
    viewer: "00000000-0000-4000-8000-000000000901",
    device: "00000000-0000-4000-8000-000000000601",
    mutation: "00000000-0000-4000-8000-000000000701",
    canEdit: true,
    dirty: false,
    revision: 1,
    team: "Absoluto",
    opponent: "Rival",
    date: "2026-09-30",
    sheet: {
      version: 2,
      period: 4,
      periods: 4,
      phase: "shootout",
      keeper: 1,
      players: [
        { id: "00000000-0000-4000-8000-000000000001", cap: 1, name: "Portero" },
        { id: "00000000-0000-4000-8000-000000000002", cap: 2, name: "Juan Pérez" },
      ],
      opponentCaps: [1, 2],
      events: [],
      baseline: [],
      baselineThem: 0,
      pending: null,
      shootout: { firstSide: "us", shots: [] },
    },
  };
  const saved = vi.fn<(sheet: LiveSheet) => Promise<boolean>>();
  function Harness() {
    const [record, setRecord] = useState(initial);
    saved.mockImplementation(async (sheet) => {
      setRecord({ ...record, sheet });
      return true;
    });
    return <ActaShootout record={record} enabled change={saved} onShare={vi.fn()} />;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: /Juan Pérez/ }));
  fireEvent.click(screen.getByRole("button", { name: "Gol" }));
  fireEvent.click(screen.getByRole("button", { name: "Gol" }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: /Gorro 2/ }));
  fireEvent.click(screen.getByRole("button", { name: "Gol" }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(2));
  expect(saved.mock.calls[1][0].shootout?.shots.map((shot) => shot.side)).toEqual(["us", "them"]);
  fireEvent.click(screen.getByRole("button", { name: /Juan Pérez/ }));
  fireEvent.click(screen.getByRole("button", { name: "Fallado" }));
  fireEvent.click(screen.getByRole("button", { name: "Parada del portero" }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(3));
  expect(saved.mock.calls[2][0].shootout?.shots[2].outcome).toBe("save");
});
