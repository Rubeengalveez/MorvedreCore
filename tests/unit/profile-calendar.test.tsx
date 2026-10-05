import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CalendarSyncCard } from "@/components/profile/calendar-sync-card";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("usa el origen abierto en el móvil y permite copiar aunque Clipboard no esté disponible", async () => {
  vi.stubGlobal("navigator", {});
  render(<CalendarSyncCard token="personal-test-token" baseUrl="http://localhost:3000" />);
  await waitFor(() =>
    expect(screen.getByLabelText("Enlace personal del calendario")).toHaveValue(
      `${window.location.origin}/api/calendar/feed.ics?token=personal-test-token`,
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Copiar enlace" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Enlace seleccionado");
  expect(screen.getByLabelText("Enlace personal del calendario")).toHaveFocus();
});
it("no ofrece un enlace inválido si falta el token", () => {
  render(<CalendarSyncCard token="" baseUrl="http://localhost:3000" />);
  expect(screen.getByRole("button", { name: "Copiar enlace" })).toBeDisabled();
});
