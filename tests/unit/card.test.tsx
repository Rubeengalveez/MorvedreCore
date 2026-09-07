import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "@/components/ui/card";

describe("Card", () => {
  it("keeps direct children available to divide and last-child utilities", () => {
    render(
      <Card data-testid="card">
        <span>Primero</span>
        <span>Segundo</span>
      </Card>,
    );

    expect(screen.getByTestId("card").children).toHaveLength(2);
  });

  it("keeps the accent when the child is the rendered element", () => {
    render(
      <Card asChild accentColor="#123456">
        <a href="/destino">Destino</a>
      </Card>,
    );

    const link = screen.getByRole("link", { name: "Destino" });
    expect(link.className).toContain("before:bg-[var(--card-accent-color)]");
    expect(link.getAttribute("style")).toContain("--card-accent-color: #123456");
  });
});
