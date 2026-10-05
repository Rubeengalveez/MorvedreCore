import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { TrainingPlanEditor } from "@/app/(app)/admin/trainings/_components/training-plan-editor";
import { TrainingDateEditor } from "@/app/(app)/admin/trainings/_components/training-date-editor";
import { TrainingManagement } from "@/app/(app)/admin/trainings/_components/training-management";
import type {
  ManagedTrainingSession,
  ManagedTrainingBlock,
} from "@/lib/domain/training-management";

const actions = vi.hoisted(() => ({ save: vi.fn(), change: vi.fn(), preview: vi.fn() }));
vi.mock("@/server/actions/admin/training-management", () => ({
  saveTrainingPlanAction: actions.save,
  changeTrainingDatesAction: actions.change,
  previewTrainingChangeAction: actions.preview,
  finishTrainingPlanAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
const teamA = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  label: "Cadete A",
  color: "#1E5AA8",
  home_pool: null,
};
const teamB = {
  id: "550e8400-e29b-41d4-a716-446655440002",
  label: "Juvenil",
  color: "#DC2626",
  home_pool: null,
};
const onClose = vi.fn(),
  onSaved = vi.fn();
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-04T10:00:00Z"));
  vi.clearAllMocks();
  actions.save.mockResolvedValue({ created: 1 });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
function renderPlan() {
  render(
    <TrainingPlanEditor
      teams={[teamA, teamB]}
      players={[]}
      seasonEnd="2027-07-31"
      onClose={onClose}
      onSaved={onSaved}
    />,
  );
}
describe("training editor flows", () => {
  it("preserves a future schedule start date when editing", () => {
    const block = {
      schedule_slot_id: null,
      series_id: null,
      player_ids: null,
      created_at: "2026-10-04T10:00:00Z",
      updated_at: "2026-10-04T10:00:00Z",
      created_by: null,
      is_active: true,
      location: null,
      maps_url: null,
      id: teamB.id,
      team_id: teamA.id,
      start_date: "2026-12-01",
      end_date: "2027-01-31",
      kind: "water",
      label: "Agua",
      weekdays: [1],
      start_time: "18:00",
      end_time: "19:30",
      excluded_dates: [],
    } as ManagedTrainingBlock;
    render(
      <TrainingPlanEditor
        teams={[teamA]}
        players={[]}
        blocks={[block]}
        seasonEnd="2027-07-31"
        onClose={onClose}
        onSaved={onSaved}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-12-01");
  });
  function renderList(cancelled: boolean) {
    const session = {
      id: "550e8400-e29b-41d4-a716-446655440003",
      team_id: teamA.id,
      scheduled_at: "2026-10-05T16:00:00Z",
      duration_minutes: 90,
      kind: "water",
      label: "Agua",
      cancelled,
      location: "Piscina",
      player_ids: null,
      joint_id: null,
    } as ManagedTrainingSession;
    render(
      <TrainingManagement
        teams={[teamA]}
        managedTeamIds={[teamA.id]}
        canManageAttendance={false}
        players={[]}
        blocks={[]}
        sessions={[session]}
        from="2026-10-04"
        to="2026-10-31"
        seasonEnd="2027-07-31"
      />,
    );
  }
  it("opens cancellation directly from its card with the reason field", () => {
    renderList(false);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("dialog", { name: "Cancelar entrenamiento" })).toBeVisible();
    expect(screen.getByLabelText("Motivo")).toBeVisible();
    expect(screen.queryByLabelText("Inicio")).toBeNull();
  });
  it("asks for confirmation directly before restoring a cancelled session", () => {
    renderList(true);
    fireEvent.click(screen.getByRole("button", { name: "Reactivar" }));
    expect(screen.getByRole("heading", { name: "Reactivar 1 entrenamiento" })).toBeVisible();
    expect(actions.change).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Reactivar entrenamiento" })).toBeEnabled();
  });
  it("guides joint weekly creation and waits for confirmation before writing", async () => {
    renderPlan();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Elige al menos un equipo");
    fireEvent.click(screen.getByRole("button", { name: "Cadete A" }));
    fireEvent.click(screen.getByRole("button", { name: "Juvenil" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Lun" }));
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-10-12" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByRole("dialog", { name: "Confirmar horario" })).toBeVisible();
    expect(actions.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Crear horario" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(actions.save.mock.calls[0][0].team_ids).toEqual([teamA.id, teamB.id]);
  });
  it("creates a one-off meeting without weekday selection", async () => {
    renderPlan();
    fireEvent.click(screen.getByRole("button", { name: "Un día suelto" }));
    fireEvent.click(screen.getByRole("button", { name: "Reunión" }));
    fireEvent.click(screen.getByRole("button", { name: "Cadete A" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.queryByRole("button", { name: "Lun" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir entrenamiento" }));
    await waitFor(() => expect(actions.save).toHaveBeenCalledOnce());
    expect(actions.save.mock.calls[0][0].mode).toBe("single");
  });
  it("keeps the entered plan after a failed save", async () => {
    actions.save.mockRejectedValue(new Error("Ese horario coincide con otro entrenamiento."));
    renderPlan();
    fireEvent.click(screen.getByRole("button", { name: "Un día suelto" }));
    fireEvent.click(screen.getByRole("button", { name: "Cadete A" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir entrenamiento" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("coincide"));
    expect(onClose).not.toHaveBeenCalled();
  });
  it("protects unsaved changes with the blue confirmation sheet", () => {
    renderPlan();
    fireEvent.click(screen.getByRole("button", { name: "Cadete A" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(screen.getByRole("dialog", { name: "¿Salir sin guardar?" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(screen.getByRole("button", { name: "Cadete A" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(onClose).not.toHaveBeenCalled();
  });
  it("previews the exact sessions affected before bulk cancellation", async () => {
    actions.preview.mockResolvedValue([
      { id: "session1", team_id: teamA.id, scheduled_at: "2026-10-05T16:00:00Z", cancelled: false },
    ]);
    render(
      <TrainingDateEditor
        teams={[teamA, teamB]}
        players={[]}
        initialOperation="cancel"
        onClose={onClose}
        onSaved={onSaved}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cadete A" }));
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Vacaciones" } });
    fireEvent.click(screen.getByRole("button", { name: "Revisar cambio" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Confirmar cancelación" })).toBeEnabled(),
    );
    expect(actions.change).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));
    await waitFor(() =>
      expect(actions.change).toHaveBeenCalledWith(
        expect.objectContaining({
          session_ids: ["session1"],
          operation: "cancel",
          reason: "Vacaciones",
        }),
      ),
    );
  });
});
