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
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("PushManager", class {});
  vi.stubGlobal("Notification", {
    permission: "granted",
    requestPermission: vi.fn().mockResolvedValue("granted"),
  });
  vi.stubGlobal("navigator", {
    serviceWorker: {
      getRegistration: async () => ({ pushManager: { getSubscription, subscribe } }),
    },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("PushSettings failure feedback", () => {
  it("does not label a browser subscription as active for another account", async () => {
    status.mockResolvedValue(false);
    render(<PushSettings publicKey="test-key" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Activar avisos" })).toBeEnabled(),
    );
    expect(screen.queryByText("Activo para esta cuenta.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Probar avisos" })).toBeDisabled();
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
    const activate = await screen.findByRole("button", { name: "Activar avisos" });
    await waitFor(() => expect(activate).toBeEnabled());
    expect(unsubscribe).not.toHaveBeenCalled();
    fireEvent.click(activate);
    expect(await screen.findByRole("status")).toHaveTextContent("Avisos activados");
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
    const activate = await screen.findByRole("button", { name: "Activar avisos" });
    await waitFor(() => expect(activate).toBeEnabled());
    fireEvent.click(activate);
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos activar");
    expect(cancelNew).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Activar avisos" })).toBeEnabled();
    });
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
    fireEvent.click(await screen.findByRole("button", { name: "Desactivar avisos" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos desactivar");
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Desactivar avisos" })).toBeInTheDocument();
  });

  it("reports success only after the server and browser unsubscribe", async () => {
    request.mockResolvedValue({ ok: true });
    render(<PushSettings publicKey="test-key" />);
    fireEvent.click(await screen.findByRole("button", { name: "Desactivar avisos" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Avisos desactivados");
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Activar avisos" })).toBeInTheDocument();
  });

  it("explains browser cancellation failure", async () => {
    request.mockResolvedValue({ ok: true });
    unsubscribe.mockResolvedValue(false);
    render(<PushSettings publicKey="test-key" />);
    fireEvent.click(await screen.findByRole("button", { name: "Desactivar avisos" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("el navegador no ha cancelado");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("handles a rejected test request without an unhandled promise", async () => {
    request.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<PushSettings publicKey="test-key" />);
    await screen.findByRole("button", { name: "Desactivar avisos" });
    fireEvent.click(screen.getByRole("button", { name: "Probar avisos" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Comprueba tu conexión");
  });
});

it("no espera indefinidamente si no hay un service worker registrado", async () => {
  vi.stubGlobal("navigator", { serviceWorker: { getRegistration: async () => undefined } });
  render(<PushSettings publicKey="test-key" />);
  expect(await screen.findByRole("status")).toHaveTextContent("Instala la app");
  expect(screen.queryByRole("button", { name: "Activar avisos" })).not.toBeInTheDocument();
});

it("no declara éxito si el servidor no ha entregado la prueba", async () => {
  request.mockResolvedValue({ ok: true, json: async () => ({ success: false }) });
  render(<PushSettings publicKey="test-key" />);
  await screen.findByRole("button", { name: "Desactivar avisos" });
  fireEvent.click(screen.getByRole("button", { name: "Probar avisos" }));
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(screen.queryByText(/Prueba enviada/)).not.toBeInTheDocument();
});

it("espera la primera activación del servicio publicado sin bloquear los ajustes", async () => {
  vi.stubEnv("NODE_ENV", "production");
  getSubscription.mockResolvedValue(null);
  vi.stubGlobal("navigator", {
    serviceWorker: {
      getRegistration: async () => undefined,
      ready: Promise.resolve({ active: {}, pushManager: { getSubscription, subscribe } }),
    },
  });
  render(<PushSettings publicKey="test-key" />);
  expect(await screen.findByRole("button", { name: "Activar avisos" })).toBeEnabled();
  expect(screen.queryByText(/Instala la app/)).not.toBeInTheDocument();
});

it("actualiza el estado al volver de los ajustes de permisos del móvil", async () => {
  render(<PushSettings publicKey="test-key" />);
  await screen.findByRole("button", { name: "Desactivar avisos" });
  vi.stubGlobal("Notification", { permission: "denied", requestPermission: vi.fn() });
  fireEvent(window, new Event("focus"));
  expect(await screen.findByRole("button", { name: "Activar avisos" })).toBeEnabled();
});
