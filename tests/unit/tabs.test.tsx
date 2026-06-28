import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Tabs, type Tab } from "@/components/ui/tabs";

const TABS: Tab[] = [
  { id: "principal", label: "Principal" },
  { id: "jugadores", label: "Jugadores" },
  { id: "partidos", label: "Partidos" },
];

describe("Tabs", () => {
  it("renders one tab per item with role=tab", () => {
    render(<Tabs tabs={TABS} active="principal" basePath="/team/abc" />);
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("marks the active tab with aria-selected=true", () => {
    render(<Tabs tabs={TABS} active="jugadores" basePath="/team/abc" />);
    const active = screen.getByRole("tab", { name: "Jugadores" });
    expect(active.getAttribute("aria-selected")).toBe("true");
    const inactive = screen.getByRole("tab", { name: "Principal" });
    expect(inactive.getAttribute("aria-selected")).toBe("false");
  });

  it("inactive tab links include ?tab=…", () => {
    render(<Tabs tabs={TABS} active="principal" basePath="/team/abc" />);
    const jugadores = screen.getByRole("tab", { name: "Jugadores" });
    expect(jugadores.getAttribute("href")).toBe("/team/abc?tab=jugadores");
    const partidos = screen.getByRole("tab", { name: "Partidos" });
    expect(partidos.getAttribute("href")).toBe("/team/abc?tab=partidos");
  });

  it("active tab links to the base path with no query", () => {
    render(<Tabs tabs={TABS} active="principal" basePath="/team/abc" />);
    const principal = screen.getByRole("tab", { name: "Principal" });
    expect(principal.getAttribute("href")).toBe("/team/abc");
  });

  it("exposes the data-tab-id attribute for testability", () => {
    render(<Tabs tabs={TABS} active="principal" basePath="/team/abc" />);
    const jugadores = screen.getByRole("tab", { name: "Jugadores" });
    expect(jugadores.getAttribute("data-tab-id")).toBe("jugadores");
    expect(jugadores.getAttribute("data-active")).toBe("false");
  });
});
