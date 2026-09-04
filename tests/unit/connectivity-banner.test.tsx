import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ConnectivityBanner, useIsOnline } from "@/components/ui/connectivity-banner";

describe("ConnectivityBanner", () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    originalOnLine = navigator.onLine;
  });

  afterEach(() => {
    Object.defineProperty(navigator, "onLine", {
      value: originalOnLine,
      configurable: true,
    });
  });

  it("does not render when user is online", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    render(<ConnectivityBanner />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("renders offline banner when connection is lost", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });

    render(<ConnectivityBanner />);
    const banner = screen.getByRole("status");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/Sin conexión a internet/i);
  });

  it("shows reconnected message briefly when connection returns", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });

    const { rerender } = render(<ConnectivityBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/Sin conexión a internet/i);

    act(() => {
      Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
      window.dispatchEvent(new Event("online"));
    });

    rerender(<ConnectivityBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/Conexión restablecida/i);
  });
});
