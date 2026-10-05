import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  preference: vi.fn(),
  mark: vi.fn(),
  all: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/components/push/push-settings", () => ({ PushSettings: () => <p>Dispositivo</p> }));
vi.mock("@/server/actions/admin/notifications", () => ({
  setNotificationPreference: mocks.preference,
  markNotificationRead: mocks.mark,
  markAllNotificationsRead: mocks.all,
}));
import { NotificationPreferencesButton } from "@/app/(app)/notifications/_components/notification-preferences";
import {
  MarkAllNotificationsButton,
  NotificationReadOnOpen,
} from "@/app/(app)/notifications/_components/notification-actions";
import { notificationPreferences } from "@/lib/domain/notifications";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.preference.mockResolvedValue(undefined);
  mocks.all.mockResolvedValue(undefined);
  mocks.mark.mockResolvedValue(undefined);
});
afterEach(cleanup);
it("mantiene el interruptor si no se guarda y muestra el error", async () => {
  mocks.preference.mockRejectedValue(new Error("offline"));
  render(<NotificationPreferencesButton initial={notificationPreferences([])} admin={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Configurar notificaciones" }));
  fireEvent.click(screen.getByRole("switch", { name: "Ausencias y correcciones" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos guardar");
  expect(screen.getByRole("switch", { name: "Ausencias y correcciones" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  expect(screen.queryByRole("switch", { name: "Solicitudes de acceso" })).not.toBeInTheDocument();
});
it("guarda cada tema explícitamente y refleja su nuevo estado", async () => {
  render(<NotificationPreferencesButton initial={notificationPreferences([])} admin />);
  fireEvent.click(screen.getByRole("button", { name: "Configurar notificaciones" }));
  fireEvent.click(screen.getByRole("switch", { name: "Convocatorias" }));
  await waitFor(() =>
    expect(screen.getByRole("switch", { name: "Convocatorias" })).toHaveAttribute(
      "aria-checked",
      "false",
    ),
  );
  expect(mocks.preference).toHaveBeenCalledWith({ topic: "convocatoria", enabled: false });
});
it("confirmar todos exige revisar la acción y cancelar no modifica nada", () => {
  render(<MarkAllNotificationsButton />);
  fireEvent.click(screen.getByRole("button", { name: "Marcar todas como leídas" }));
  expect(mocks.all).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Volver" }));
  expect(mocks.all).not.toHaveBeenCalled();
});
it("no vuelve a marcar un aviso que ya estaba leído", () => {
  render(<NotificationReadOnOpen id="notice" unread={false} />);
  expect(mocks.mark).not.toHaveBeenCalled();
});
it("un fallo al marcar leído no oculta el contenido ni declara éxito", async () => {
  mocks.mark.mockRejectedValue(new Error("offline"));
  render(<NotificationReadOnOpen id="notice" unread />);
  expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos marcar");
  expect(mocks.refresh).not.toHaveBeenCalled();
});
