import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ signOut: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock("@/server/actions/auth", () => ({ signOut: mocks.signOut }));
import { SignOutButton } from "@/components/auth/sign-out-button";

const unsubscribe = vi.fn();
const closeNotification = vi.fn();
const getSubscription = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signOut.mockResolvedValue({});
  unsubscribe.mockResolvedValue(true);
  getSubscription.mockResolvedValue({ endpoint: "https://push.example.test/device", unsubscribe });
  vi.stubGlobal("navigator", {
    serviceWorker: {
      getRegistration: async () => ({
        pushManager: { getSubscription },
        getNotifications: async () => [{ close: closeNotification }],
      }),
    },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("removes local push and displayed notifications before leaving the account", async () => {
  render(<SignOutButton />);
  fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"));
  expect(unsubscribe).toHaveBeenCalledOnce();
  expect(closeNotification).toHaveBeenCalledOnce();
  expect(mocks.signOut).toHaveBeenCalledWith({
    endpoint: "https://push.example.test/device",
    localPushRemoved: true,
  });
  expect(unsubscribe.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.signOut.mock.invocationCallOrder[0]!,
  );
});

it("allows the server to deactivate push when browser removal fails", async () => {
  unsubscribe.mockRejectedValue(new Error("browser failure"));
  render(<SignOutButton />);
  fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"));
  expect(mocks.signOut).toHaveBeenCalledWith({
    endpoint: "https://push.example.test/device",
    localPushRemoved: false,
  });
});

it("keeps the user on the page when the server cannot sign out", async () => {
  mocks.signOut.mockResolvedValue({ error: "No pudimos cerrar la sesión." });
  render(<SignOutButton />);
  fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cerrar");
  expect(mocks.replace).not.toHaveBeenCalled();
});

it("handles a network failure without claiming logout succeeded", async () => {
  mocks.signOut.mockRejectedValue(new Error("network failure"));
  render(<SignOutButton />);
  fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Comprueba tu conexión");
  expect(mocks.replace).not.toHaveBeenCalled();
});

it("still signs out on a browser with service workers but no push support", async () => {
  vi.stubGlobal("navigator", { serviceWorker: { getRegistration: async () => ({}) } });
  render(<SignOutButton />);
  fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"));
  expect(mocks.signOut).toHaveBeenCalledWith({ endpoint: undefined, localPushRemoved: false });
});
