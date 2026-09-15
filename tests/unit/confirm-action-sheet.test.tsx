import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { ConfirmActionSheet } from "@/components/ui/confirm-action-sheet";

it("confirma desde una lámina inferior sin ejecutar la acción al cancelar", () => {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();

  render(
    <ConfirmActionSheet
      open
      onOpenChange={onOpenChange}
      title="Eliminar producto"
      description="Esta acción no se puede deshacer."
      confirmLabel="Sí, eliminar producto"
      onConfirm={onConfirm}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(onConfirm).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Sí, eliminar producto" }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

it("bloquea el cierre y muestra progreso mientras procesa", () => {
  render(
    <ConfirmActionSheet
      open
      onOpenChange={vi.fn()}
      title="Eliminar producto"
      description="Esta acción no se puede deshacer."
      isPending
      onConfirm={vi.fn()}
    />,
  );

  expect(screen.getByRole("button", { name: "Procesando…" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
});
