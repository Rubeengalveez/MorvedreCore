import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
vi.mock("@/components/ui/page-shell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  self: vi.fn(),
  access: vi.fn(),
  treasury: vi.fn(),
}));
vi.mock("@/server/queries/active-profile", () => ({ getActiveProfileContext: mocks.context }));
vi.mock("@/server/queries/self-profile", () => ({ getSelfProfile: mocks.self }));
vi.mock("@/server/actions/admin/_helpers", () => ({ getRenderAdminAccess: mocks.access }));
vi.mock("@/server/queries/treasury", () => ({ getFamilyTreasury: mocks.treasury }));
vi.mock("@/server/queries/seasons", () => ({
  getCurrentSeason: async () => ({ start_date: "2025-09-01" }),
}));
vi.mock("@/components/auth/sign-out-button", () => ({
  SignOutButton: () => <button>Cerrar sesión</button>,
}));
import ProfilePage from "@/app/(app)/profile/page";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.mockResolvedValue({
    ownProfile: { id: "own", is_active: true },
    linkedProfiles: [],
  });
  mocks.self.mockResolvedValue({
    profile: {
      id: "own",
      full_name: "Sol López",
      photo_url: null,
      birth_year: 1971,
      team_color: null,
    },
    isPlayer: false,
  });
  mocks.access.mockResolvedValue({
    isAdmin: false,
    permissions: new Set(),
    coachTeamIds: new Set(),
    matchStaffTeamIds: new Set(),
    delegateTeamIds: new Set(),
  });
  mocks.treasury.mockResolvedValue({ canView: false, totalPendingCents: 0 });
});
afterEach(cleanup);
it("una cuenta normal no recibe accesos de administración ni información de cuotas ajenas", async () => {
  render(await ProfilePage());
  expect(screen.queryByRole("link", { name: "Administración" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Cuotas y pagos/ })).not.toBeInTheDocument();
  expect(mocks.treasury).toHaveBeenCalledWith("own");
});
it("Sol conserva únicamente su función de tienda y el acceso al panel autorizado", async () => {
  mocks.access.mockResolvedValue({
    isAdmin: false,
    permissions: new Set(["manage_shop"]),
    coachTeamIds: new Set(),
    matchStaffTeamIds: new Set(),
    delegateTeamIds: new Set(),
  });
  render(await ProfilePage());
  expect(screen.getByText("Tienda")).toBeInTheDocument();
  expect(screen.queryByText("Administrador")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Administración" })).toHaveAttribute("href", "/admin");
});
it("un tutor consulta sus hijos sin recibir permiso para editar sus datos o sus funciones", async () => {
  mocks.context.mockResolvedValue({
    ownProfile: { id: "own", is_active: true },
    linkedProfiles: [{ id: "child", full_name: "Lucía López", birth_year: 2014 }],
  });
  render(await ProfilePage());
  expect(screen.getByRole("link", { name: /Mis hijos/ })).toHaveAttribute(
    "href",
    "/profile/family",
  );
  expect(screen.getByRole("link", { name: "Editar mis datos" })).toHaveAttribute(
    "href",
    "/profile/edit",
  );
  expect(screen.queryByRole("link", { name: "Administración" })).not.toBeInTheDocument();
});
