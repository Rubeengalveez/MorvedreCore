import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";

describe("PwaInstallPrompt", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("contiene el foco en la ayuda de iOS y lo devuelve al botón al cerrar con Escape", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("iPhone Safari");
    vi.useFakeTimers();
    render(<PwaInstallPrompt />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3001);
    });
    vi.useRealTimers();
    const trigger = screen.getByRole("button", { name: "Ver cómo" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Instalar en tu iPhone o iPad" });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    trigger.focus();
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    expect(within(dialog).getByText("Añadir a la pantalla de inicio")).toBeVisible();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Instalar en tu iPhone o iPad" })).toBeNull(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("can appear after the initial render without changing the hook order", () => {
    render(<PwaInstallPrompt />);

    expect(screen.queryByRole("dialog", { name: "Instalar Morvedre Core" })).toBeNull();

    act(() => {
      window.dispatchEvent(new Event("beforeinstallprompt", { cancelable: true }));
    });

    expect(screen.getByRole("dialog", { name: "Instalar Morvedre Core" })).toBeInTheDocument();
  });
});
