import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Route } from "next";
import { describe, expect, it, vi } from "vitest";

import { MatchDetailsForm } from "@/app/(app)/admin/matches/[id]/_components/match-details-form";
import type { MatchRow } from "@/server/actions/admin";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const { mockLeave, mockUpdate } = vi.hoisted(() => ({ mockLeave: vi.fn(), mockUpdate: vi.fn() }));
vi.mock("@/components/matches/use-acta-back-guard", () => ({ useActaBackGuard: () => mockLeave }));
vi.mock("@/server/actions/admin", () => ({ updateMatch: mockUpdate }));

const MATCH = {
  id: "match-1",
  opponent: "Prueba",
  competition_type: "friendly",
  status: "scheduled",
  is_home: false,
  scheduled_at: "2026-09-29T16:00:00.000Z",
  location: null,
  pool_name: null,
  maps_url: null,
  notes: null,
} as MatchRow;

describe("MatchDetailsForm", () => {
  it.each(["/admin/matches", "/matches/match-1"] as const)(
    "guarda y vuelve a %s solo cuando se han guardado los datos",
    async (backHref) => {
      mockLeave.mockClear();
      mockUpdate.mockReset();
      let resolveSave!: () => void;
      mockUpdate.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
      );
      render(
        <MatchDetailsForm
          match={MATCH}
          teamLabel="Absoluto"
          backHref={backHref as Route}
          backLabel="Volver"
        />,
      );
      fireEvent.change(screen.getByRole("textbox", { name: "Rival" }), {
        target: { value: "Otro rival" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
      await waitFor(() =>
        expect(mockUpdate).toHaveBeenCalledWith(
          "match-1",
          expect.objectContaining({ opponent: "Otro rival" }),
        ),
      );
      expect(mockLeave).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Guardando..." })).toBeDisabled();
      resolveSave();
      await waitFor(() => expect(mockLeave).toHaveBeenCalledWith(backHref));
    },
  );

  it("mantiene la edición si no puede guardar el partido", async () => {
    mockLeave.mockClear();
    mockUpdate.mockReset().mockRejectedValue(new Error("No pudimos guardar."));
    render(
      <MatchDetailsForm
        match={MATCH}
        teamLabel="Absoluto"
        backHref="/admin/matches"
        backLabel="Volver"
      />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Rival" }), {
      target: { value: "Otro rival" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(screen.getByText("No pudimos guardar.")).toBeVisible());
    expect(mockLeave).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Rival" })).toHaveValue("Otro rival");
  });

  it("ofrece guardar, seguir editando o salir al volver con cambios", () => {
    const match = {
      id: "match-1",
      opponent: "Prueba",
      competition_type: "league",
      status: "scheduled",
      is_home: true,
      scheduled_at: "2026-09-29T16:00:00.000Z",
      location: null,
      pool_name: null,
      maps_url: null,
      notes: null,
    } as MatchRow;

    render(
      <MatchDetailsForm
        match={match}
        teamLabel="Absoluto"
        backHref="/admin/matches"
        backLabel="Volver al partido"
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Rival" }), {
      target: { value: "Otro rival" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Volver al partido" }));

    expect(screen.getByRole("heading", { name: "Cambios sin guardar" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Guardar y volver" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Seguir editando" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Salir sin guardar" })).toBeVisible();
  });
});
