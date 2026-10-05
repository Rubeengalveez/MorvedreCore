import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PlayerPhoto } from "@/components/team/player-photo";
import { PlayerSeasonStats } from "@/components/team/player-season-stats";
import { playerActaPerformance } from "@/lib/domain/player-acta-performance";

afterEach(cleanup);
const empty = playerActaPerformance([], "player");

describe("Ficha deportiva del jugador", () => {
  it("oculta ambas estadísticas de portería cuando son cero", () => {
    render(<PlayerSeasonStats stats={empty} exclusions={0} mvpCount={null} />);
    expect(screen.queryByText("Paradas")).not.toBeInTheDocument();
    expect(screen.queryByText("Goles recibidos")).not.toBeInTheDocument();
    expect(
      screen
        .getAllByRole("term")
        .slice(0, 3)
        .map((term) => term.textContent),
    ).toEqual(["Partidos", "Goles", "Asistencias"]);
    expect(screen.getByText("Tiros")).toBeVisible();
    expect(screen.queryByText(/Tiros registrados|Medias de las actas/)).not.toBeInTheDocument();
  });

  it.each([
    [3, 0, "Paradas", "Goles recibidos"],
    [0, 2, "Goles recibidos", "Paradas"],
  ] as const)(
    "muestra solo el dato positivo de portería (%s/%s)",
    (saves, conceded, shown, hidden) => {
      render(
        <PlayerSeasonStats stats={{ ...empty, saves, conceded }} exclusions={0} mvpCount={0} />,
      );
      expect(screen.getByText(shown)).toBeVisible();
      expect(screen.queryByText(hidden)).not.toBeInTheDocument();
    },
  );

  it("mantiene los totales y las medias de las actas", () => {
    const stats = {
      ...empty,
      matches: 4,
      goals: 6,
      assists: 2,
      shots: 10,
      shootingPercent: 60,
      goalsPerMatch: 1.5,
      assistsPerMatch: 0.5,
    };
    render(<PlayerSeasonStats stats={stats} exclusions={3} mvpCount={1} />);
    const terms = screen.getAllByRole("term");
    expect(
      terms.slice(0, 3).map((term) => term.parentElement?.querySelector("dd")?.textContent),
    ).toEqual(["4", "6", "2"]);
    expect(screen.getByText("1,5")).toBeVisible();
    expect(screen.getByText("60 %")).toBeVisible();
  });

  it("sin foto no ofrece un botón de ampliación vacío", () => {
    render(<PlayerPhoto src={null} name="Juan López" teamColor="#0A2E5C" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("abre la foto y permite cerrarla sin salir del perfil", async () => {
    render(<PlayerPhoto src="/brand/logo.webp" name="Juan López" teamColor="#0A2E5C" />);
    const trigger = screen.getByRole("button", { name: "Ampliar foto de Juan López" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Foto de Juan López" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar foto" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toBeVisible();
  });
});
