import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SwimTimeEntryList } from "@/components/swim-times/swim-time-entry-list";

const save = vi.hoisted(() => vi.fn());
vi.mock("@/server/actions/swim-times", () => ({ createSwimTime: save }));
vi.mock("@/components/ui/adaptive-player-name", () => ({
  AdaptivePlayerName: ({ name }: { name: string }) => <span>{name}</span>,
}));

beforeEach(() => {
  cleanup();
  save.mockReset();
});

function enter(seconds = "34") {
  render(
    <SwimTimeEntryList
      teamId="team"
      teamColor="#0A2E5C"
      today="2026-10-02"
      existingEntries={[]}
      players={[
        {
          player_id: "pau",
          full_name: "Pau Pérez Méndez",
          cap_number: 1,
          squad_number: 1,
          photo_url: null,
        },
      ]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Pau Pérez Méndez/ }));
  fireEvent.change(screen.getByLabelText("Segundos"), { target: { value: seconds } });
}

describe("Registrar tiempos de nado", () => {
  it("congela la elección mientras guarda y evita duplicados por doble pulsación", async () => {
    let resolve!: (result: unknown) => void;
    save.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    enter();
    const button = screen.getByRole("button", { name: "GUARDAR TIEMPO" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Segundos")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cambiar jugador seleccionado" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^100 m/ })).toBeDisabled();
    resolve({ ok: true, entryId: "entry", revision: 1 });
    await waitFor(() =>
      expect(screen.getByText(/^Guardado para/)).toHaveTextContent(
        "Guardado para Pau Pérez Méndez: 50 m en 34,00 s.",
      ),
    );
  });

  it("conserva los datos tras perder conexión y reutiliza el identificador al reintentar", async () => {
    save
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ ok: true, entryId: "entry", revision: 1 });
    enter();
    fireEvent.click(screen.getByRole("button", { name: "GUARDAR TIEMPO" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("No pudimos confirmar"),
    );
    expect(screen.getByLabelText("Segundos")).toHaveValue("34");
    const operationId = save.mock.calls[0][0].operationId;
    fireEvent.click(screen.getByRole("button", { name: "GUARDAR TIEMPO" }));
    await waitFor(() =>
      expect(screen.getByText(/^Guardado para/)).toHaveTextContent(
        "Guardado para Pau Pérez Méndez",
      ),
    );
    expect(save.mock.calls[1][0].operationId).toBe(operationId);
  });

  it("cambiar la distancia obliga a revisar de nuevo un tiempo poco habitual", () => {
    enter("12");
    fireEvent.click(screen.getByRole("button", { name: "GUARDAR TIEMPO" }));
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^100 m/ }));
    fireEvent.click(screen.getByRole("button", { name: "GUARDAR TIEMPO" }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("poco habitual");
  });
});
