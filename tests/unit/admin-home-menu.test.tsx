import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { AdminHomeMenu } from "@/components/admin/admin-home-menu";
import { AdminPermissionLayout } from "@/components/admin/admin-permission-layout";
import { deriveAdminCapabilities, type AdminPermission } from "@/lib/domain/permissions";

const mocks = vi.hoisted(() => ({ access: vi.fn(), redirect: vi.fn() }));
vi.mock("@/server/actions/admin/_helpers", () => ({
  getRenderAdminAccess: mocks.access,
  requireAdmin: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const accessFor = (permissions: AdminPermission[] = [], isAdmin = false) =>
  deriveAdminCapabilities({
    isAdmin,
    permissions: permissions.map((permission) => ({ permission })),
    roles: [],
    staff: [],
  });

function links() {
  return within(
    screen.getByRole("navigation", { name: "Funciones de administración" }),
  ).queryAllByRole("link");
}

describe("Inicio de administración según permisos", () => {
  it.each([
    ["Sol", "manage_shop", "/admin/shop", "Tienda"],
    ["Mónica", "manage_treasury", "/admin/treasury", "Tesorería"],
    ["Entrenamientos", "manage_trainings", "/admin/trainings", "Entrenamientos"],
    ["Jugadores", "manage_players", "/admin/players", "Jugadores"],
  ] as const)("%s solo ve el módulo autorizado", (_name, permission, href, label) => {
    render(<AdminHomeMenu access={accessFor([permission])} />);
    expect(links()).toHaveLength(1);
    expect(links()[0]).toHaveAttribute("href", href);
    expect(links()[0]).toHaveTextContent(label);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /filtros/i })).not.toBeInTheDocument();
  });

  it("combina permisos sin añadir funciones ajenas", () => {
    render(<AdminHomeMenu access={accessFor(["manage_shop", "manage_treasury"])} />);
    expect(links().map((link) => link.getAttribute("href"))).toEqual([
      "/admin/shop",
      "/admin/treasury",
    ]);
  });

  it("un entrenador ve solo las funciones deportivas de sus equipos", () => {
    const access = deriveAdminCapabilities({
      isAdmin: false,
      permissions: [],
      roles: [{ role: "coach", scope_team_id: "team" }],
      staff: [],
    });
    render(<AdminHomeMenu access={access} />);
    expect(links().map((link) => link.getAttribute("href"))).toEqual([
      "/admin/matches",
      "/admin/trainings",
    ]);
  });

  it("el administrador general conserva once accesos sin la importación", () => {
    render(<AdminHomeMenu access={accessFor([], true)} />);
    expect(links()).toHaveLength(11);
    expect(screen.queryByRole("link", { name: /Importar/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Jugadores/ })).toHaveAttribute(
      "href",
      "/admin/players",
    );
    expect(screen.getByRole("heading", { name: "Gestión diaria" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Personas" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Organización" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Solicitudes de acceso/ })).toHaveAttribute(
      "href",
      "/admin/access-requests",
    );
  });

  it("un miembro sin permisos no recibe enlaces administrativos", () => {
    render(<AdminHomeMenu access={accessFor()} />);
    expect(links()).toHaveLength(0);
  });

  it.each([
    ["manage_shop", "manage_treasury"],
    ["manage_treasury", "manage_shop"],
  ] as const)("%s tampoco abre una URL de %s directamente", async (allowed, forbidden) => {
    mocks.access.mockResolvedValue(accessFor([allowed]));
    mocks.redirect.mockImplementation(() => {
      throw new Error("redirect:/admin");
    });
    await expect(
      AdminPermissionLayout({ permission: forbidden, children: <p>Privado</p> }),
    ).rejects.toThrow("redirect:/admin");
    expect(mocks.redirect).toHaveBeenCalledWith("/admin");
  });
});
