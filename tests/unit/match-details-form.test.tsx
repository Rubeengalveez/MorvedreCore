import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MatchDetailsForm } from "@/app/(app)/admin/matches/[id]/_components/match-details-form";
import type { MatchRow } from "@/server/actions/admin";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/matches/use-acta-back-guard", () => ({ useActaBackGuard: () => vi.fn() }));
vi.mock("@/server/actions/admin", () => ({ updateMatch: vi.fn() }));

describe("MatchDetailsForm", () => {
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
