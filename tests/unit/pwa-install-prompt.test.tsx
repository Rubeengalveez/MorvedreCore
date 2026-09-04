import { act, render, screen } from "@testing-library/react";
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
    vi.restoreAllMocks();
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
