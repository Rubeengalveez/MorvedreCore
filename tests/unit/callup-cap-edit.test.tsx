import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { updateCallupSchema } from "@/lib/domain/admin-schemas";
const mocks = vi.hoisted(() => ({
  update: vi.fn().mockResolvedValue({ ok: true }),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/server/actions/admin", () => ({ deleteCallup: vi.fn() }));
vi.mock("@/server/actions/admin/matches", () => ({ updateCallupResult: mocks.update }));
import {
  CallupList,
  type CallupEntry,
} from "@/app/(app)/admin/matches/[id]/_components/callup-list";
afterEach(cleanup);
const mid = "10000000-0000-4000-8000-000000000001";
const pid = "10000000-0000-4000-8000-000000000002";
it("valida la identidad real de la convocatoria al cambiar gorro", () => {
  expect(
    updateCallupSchema.safeParse({ match_id: mid, player_id: pid, cap_number: 3 }).success,
  ).toBe(true);
  expect(
    updateCallupSchema.safeParse({ match_id: mid, player_id: pid, cap_number: 0 }).success,
  ).toBe(false);
  expect(
    updateCallupSchema.safeParse({ match_id: mid, player_id: pid, cap_number: 15 }).success,
  ).toBe(false);
  expect(
    updateCallupSchema.safeParse({ match_id: mid, player_id: pid, cap_number: null }).success,
  ).toBe(true);
  expect(updateCallupSchema.safeParse({ match_id: mid, player_id: pid }).success).toBe(false);
});
it("oculta los gorros ocupados y permite elegir un número libre o dejarlo sin gorro", async () => {
  const entries = [1, 2].map((cap) => ({
    callup: { match_id: mid, player_id: cap === 1 ? pid : mid, cap_number: cap, status: "called" },
    player: {
      id: cap === 1 ? pid : mid,
      full_name: `Jugador ${cap}`,
      photo_url: null,
      birth_year: null,
      category_code: null,
    },
    sourceTeamLabel: null,
    hasConflict: false,
  })) as CallupEntry[];
  render(<CallupList entries={entries} />);
  fireEvent.click(screen.getByRole("button", { name: "Cambiar gorro de Jugador 1" }));
  expect(screen.queryByRole("button", { name: "2" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "3" }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(mid, pid, { cap_number: 3 }));

  const capButton = screen.getByRole("button", { name: "Cambiar gorro de Jugador 1" });
  await waitFor(() => expect(capButton).toBeEnabled());
  fireEvent.click(capButton);
  fireEvent.click(screen.getByRole("button", { name: "Sin gorro" }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(mid, pid, { cap_number: null }));
});
