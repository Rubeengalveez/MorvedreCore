import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/rankings/empty-state";

describe("EmptyState", () => {
  it("never renders any link or button to the admin panel", () => {
    const { container } = render(
      <EmptyState
        metricLabel="Goles"
        scopeLabel="Benjamín"
        metric="goals"
        isSchool={false}
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.querySelector("a")).toBeNull();
  });

  it("renders formative explanation for Escuela on match metrics with no admin buttons", () => {
    render(
      <EmptyState
        metricLabel="Goles"
        scopeLabel="Escuela"
        metric="goals"
        isSchool={true}
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /la escuela es formativa y no disputa partidos de competición/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/cuando se registren resultados/i)).not.toBeInTheDocument();
  });

  it("renders training attendance explanation for Escuela on attendance metric with no admin buttons", () => {
    render(
      <EmptyState
        metricLabel="Asist."
        scopeLabel="Escuela"
        metric="attendance"
        isSchool={true}
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /cuando se registre asistencia en los entrenamientos de la escuela, las posiciones se calculan solas/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders match sheet explanation for competitive categories on match metrics with no admin buttons", () => {
    render(
      <EmptyState
        metricLabel="Goles"
        scopeLabel="Cadete A"
        metric="goals"
        isSchool={false}
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.getByText(/cuando se registren resultados de partidos, las posiciones se calculan solas/i),
    ).toBeInTheDocument();
  });

  it("renders attendance explanation for competitive categories on attendance metric with no admin buttons", () => {
    render(
      <EmptyState
        metricLabel="Asist."
        scopeLabel="Infantil"
        metric="attendance"
        isSchool={false}
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /cuando se registre asistencia en los entrenamientos, las posiciones se calculan solas/i,
      ),
    ).toBeInTheDocument();
  });
});
