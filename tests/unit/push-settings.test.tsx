import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PushSettings } from "@/components/push/push-settings";

const status = vi.hoisted(() => vi.fn());
vi.mock("@/server/actions/push", () => ({ getPushSubscriptionEnabled: status }));

const unsubscribe = vi.fn();
const getSubscription = vi.fn();
const request = vi.fn();
const subscribe = vi.fn();

beforeEach(() => {
  status.mockReset().mockResolvedValue(true);
  subscribe.mockReset();
  unsubscribe.mockReset().mockResolvedValue(true);
  getSubscription
    .mockReset()
    .mockResolvedValue({ endpoint: "https://push.example.test/device", unsubscribe });
  request.mockReset();
  vi.stubGlobal("fetch", request);
  vi.stubGlobal("PushManager", class {});
  vi.stubGlobal("Notification", { requestPermission: vi.fn().mockResolvedValue("granted") });
  vi.stubGlobal("navigator", {
    serviceWorker: { ready: Promise.resolve({ pushManager: { getSubscription, subscribe } }) },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PushSettings failure feedback", () => {
  it("does not label a browser subscription as active for another account", async () => {
    status.mockResolvedValue(false);
    render(<PushSettings publicKey="test-key" />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Activar" })).toBeEnabled());
    expect(screen.queryByText("Activo para esta cuenta.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Probar" })).toBeDisabled();
  });

  it("renews an inactive browser subscription only after the user activates", async () => {
    status.mockResolvedValue(false);
    subscribe.mockResolvedValue({
      endpoint: "https://push.example.test/new",
      unsubscribe: vi.fn(),
      toJSON: () => ({ endpoint: "https://push.example.test/new" }),
    });
    request.mockResolvedValue({ ok: true });
    render(<PushSettings publicKey="test-key" />);
    const activate = await screen.findByRole("button", { name: "Activar" });
    await waitFor(() => expect(activate).toBeEnabled());
    expect(unsubscribe).not.toHaveBeenCalled();
    fireEvent.click(activate);
    expect(await screen.findByRole("status")).toHaveTextContent("Push activado");
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(subscribe).toHaveBeenCalledOnce();
  });

  it("cancels a newly created subscription if saving it fails", async () => {
    getSubscription.mockResolvedValue(null);
    const cancelNew = vi.fn().mockResolvedValue(true);
    subscribe.mockResolvedValue({
      endpoint: "https://push.example.test/new",
      unsubscribe: cancelNew,
      toJSON: () => ({ endpoint: "https://push.example.test/new" }),
    });
    request.mockResolvedValue({ ok: false });
    render(<PushSettings publicKey="test-key" />);
    const activate = await screen.findByRole("button", { name: "Activar" });
    await waitFor(() => expect(activate).toBeEnabled());
    fireEvent.click(activate);
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos guardar");
    expect(cancelNew).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Activar" })).toBeEnabled();
  });

  it("explains a failed status check without claiming push is enabled", async () => {
    status.mockRejectedValue(new Error("offline"));
    render(<PushSettings publicKey="test-key" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos comprobar");
    expect(screen.queryByText("Activo para esta cuenta.")).not.toBeInTheDocument();
  });
  it("does not report disabled or remove the local subscription after server failure", async () => {
    request.mockResolvedValue({ ok: false });
    render(<PushSettings publicKey="test-key" />);
    fireEvent.click(await screen.findByRole("button", { name: "Desactivar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos desactivar");
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Desactivar" })).toBeInTheDocument();
  });

  it("reports success only after the server and browser unsubscribe", async () => {
    request.mockResolvedValue({ ok: true });
    render(<PushSettings publicKey="test-key" />);
    fireEvent.click(await screen.findByRole("button", { name: "Desactivar" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Push desactivado");
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Activar" })).toBeInTheDocument();
  });

  it("explains browser cancellation failure", async () => {
    request.mockResolvedValue({ ok: true });
    unsubscribe.mockResolvedValue(false);
    render(<PushSettings publicKey="test-key" />);
    fireEvent.click(await screen.findByRole("button", { name: "Desactivar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("el navegador no ha cancelado");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("handles a rejected test request without an unhandled promise", async () => {
    request.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<PushSettings publicKey="test-key" />);
    await screen.findByRole("button", { name: "Desactivar" });
    fireEvent.click(screen.getByRole("button", { name: "Probar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Comprueba tu conexión");
  });
});
