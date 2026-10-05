import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TeamNavigation } from "@/components/team/team-navigation";
import { teamAdminOrigin } from "@/lib/domain/team-navigation-origin";

const navigation = vi.hoisted(() => ({ entries: [] as string[] }));

vi.mock("next/link", () => ({
  useLinkStatus: () => ({ pending: false }),
  default: ({
    href,
    replace,
    scroll: _scroll,
    children,
    ...props
  }: {
    href: string;
    replace?: boolean;
    scroll?: boolean;
    children: ReactNode;
  }) => (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        if (replace) navigation.entries[navigation.entries.length - 1] = href;
        else navigation.entries.push(href);
      }}
    >
      {children}
    </a>
  ),
}));

beforeEach(() => {
  navigation.entries = [];
});
afterEach(cleanup);

describe("Historial de las pestañas del equipo", () => {
  it.each([
    { source: "/team", base: "/team/id", context: "" },
    {
      source: "/admin/teams/id?tab=datos",
      base: "/team/id",
      context: teamAdminOrigin("id", "admin", "datos").context,
    },
    { source: "/admin/teams", base: "/admin/teams/id", context: "" },
  ])("atrás regresa a $source tras cambiar de pestaña", ({ source, base, context }) => {
    navigation.entries = [source, base];
    render(
      <TeamNavigation
        label="Secciones del equipo"
        items={["Resumen", "Plantilla", "Partidos", "Tiempos"].map((label, index) => ({
          label,
          active: index === 0,
          href: `${base}?tab=${index}${context ? `&${context}` : ""}`,
        }))}
      />,
    );
    for (const label of ["Plantilla", "Partidos", "Tiempos"])
      fireEvent.click(screen.getByRole("link", { name: label }));
    expect(navigation.entries.at(-1)).toBe(`${base}?tab=3${context ? `&${context}` : ""}`);
    navigation.entries.pop();
    expect(navigation.entries.at(-1)).toBe(source);
  });
});
