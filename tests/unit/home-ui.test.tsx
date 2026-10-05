import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeDashboard } from "@/components/dashboard/home-dashboard";
import type { DashboardHomeData } from "@/server/queries/dashboard-home";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(cleanup);
const event = {
  id: "training",
  team_id: "a",
  team_ids: ["a"],
  kind: "training" as const,
  training_kind: "water",
  scheduled_at: "2026-10-05T16:00:00Z",
  date: "2026-10-05",
  duration_minutes: 90,
  title: "Agua",
  location: "Piscina Internúcleos",
  team_label: "Alevín",
  team_color: "#123456",
  cancelled: false,
  status: "scheduled",
  is_today: false,
  is_tomorrow: true,
  personIds: ["child-a"],
  calledPersonIds: [],
  canOpenActa: false,
};
const base: DashboardHomeData = {
  name: "Rubén Gálvez",
  ownId: "own",
  now: "2026-10-04T10:00:00Z",
  hasSeason: true,
  unread: 0,
  people: [{ id: "own", name: "Rubén", photo: null, teamIds: [], staffTeamIds: [] }],
  events: [],
  tasks: [],
  issues: [],
  stats: {},
  result: null,
  news: [],
  management: [],
};
describe("Inicio: flujos de familias y estados", () => {
  it("un padre con un hijo ve directamente su actividad y sus estadísticas", () => {
    render(
      <HomeDashboard
        data={{
          ...base,
          people: [
            ...base.people,
            { id: "child-a", name: "Luis Pérez", photo: null, teamIds: ["a"], staffTeamIds: [] },
          ],
          events: [event],
          stats: { "child-a": { goals: 7, assists: 2, matches: 3 } },
        }}
      />,
    );
    expect(screen.getByRole("region", { name: "La temporada de Luis Pérez" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ver entrenamiento:/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Quién participa")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Abrir acta/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Volver a Inicio" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("cambiar de hijo filtra sin ocultar las tareas familiares", () => {
    render(
      <HomeDashboard
        data={{
          ...base,
          people: [
            ...base.people,
            { id: "child-a", name: "Luis", photo: null, teamIds: ["a"], staffTeamIds: [] },
            { id: "child-b", name: "Ana", photo: null, teamIds: ["b"], staffTeamIds: [] },
          ],
          events: [event],
          tasks: [
            {
              id: "approval",
              title: "Pedidos por autorizar",
              detail: "Revisa los pedidos de tus hijos",
              href: "/shop/parents/pending?from=dashboard",
              count: 2,
              kind: "orders",
            },
          ],
        }}
      />,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "child-b" } });
    expect(screen.queryByRole("button", { name: /Ver entrenamiento:/ })).not.toBeInTheDocument();
    expect(screen.getByText("Sin actividad próxima")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Pedidos por autorizar/ })).toHaveAttribute(
      "href",
      "/shop/parents/pending?from=dashboard",
    );
  });
  it("un error de carga no se presenta como ausencia de actividad", () => {
    render(<HomeDashboard data={{ ...base, issues: ["agenda"] }} />);
    expect(screen.getByText("Agenda no disponible")).toBeInTheDocument();
    expect(screen.queryByText("Sin actividad próxima")).not.toBeInTheDocument();
  });
  it("un partido convocado permite consultar sin dar permisos de delegado", () => {
    render(
      <HomeDashboard
        data={{
          ...base,
          events: [
            {
              ...event,
              kind: "match",
              id: "match",
              opponent: "CW Turia",
              title: "Partido contra CW Turia",
              calledPersonIds: ["own"],
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("En la convocatoria")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ver partido:/ }));
    expect(screen.getByRole("link", { name: /Ver convocatoria y partido/ })).toHaveAttribute(
      "href",
      "/matches/match?from=dashboard",
    );
    expect(screen.queryByRole("link", { name: /Abrir acta/ })).not.toBeInTheDocument();
  });
  it("un entrenador puede continuar su acta desde la actividad", () => {
    render(
      <HomeDashboard
        data={{
          ...base,
          events: [
            {
              ...event,
              kind: "match",
              id: "match",
              title: "Partido contra CW Turia",
              status: "in_progress",
              canOpenActa: true,
            },
          ],
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Ver partido:/ }));
    expect(screen.getByRole("link", { name: "Continuar acta" })).toHaveAttribute(
      "href",
      "/acta?match=match&from=dashboard",
    );
  });
  it("no abre enlaces de mapas con protocolos ejecutables", () => {
    render(
      <HomeDashboard data={{ ...base, events: [{ ...event, maps_url: "javascript:alert(1)" }] }} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Ver entrenamiento:/ }));
    expect(screen.queryByRole("link", { name: "Cómo llegar" })).not.toBeInTheDocument();
  });
});
