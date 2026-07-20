import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NewsEditor } from "@/components/news/news-editor";

describe("NewsEditor", () => {
  it("reveals one expiry control and allows pinning a new post", () => {
    render(<NewsEditor mode="create" teams={[]} onSubmit={vi.fn()} />);

    expect(screen.queryByLabelText("Fecha y hora de caducidad")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Añadir fecha de caducidad" }));
    expect(screen.getAllByLabelText("Fecha y hora de caducidad")).toHaveLength(1);

    const pin = screen.getByRole("checkbox", { name: "Destacar en Noticias" });
    expect(pin).toBeEnabled();
    fireEvent.click(pin);
    expect(pin).toBeChecked();
  });

  it("only asks for a team when the audience is a team", () => {
    render(
      <NewsEditor mode="create" teams={[{ id: "team-1", label: "Cadete B" }]} onSubmit={vi.fn()} />,
    );

    expect(screen.queryByLabelText("Equipo destinatario")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Un equipo" }));
    expect(screen.getByLabelText("Equipo destinatario")).toBeRequired();
  });

  it("allows updating an expired post without forcing a new expiry date", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <NewsEditor
        mode="edit"
        teams={[]}
        initial={{
          title: "Convocatoria de la asamblea",
          body_md: "Información actualizada para todos los socios.",
          expires_at: "2025-01-01T12:00:00.000Z",
        }}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
  });

  it("asks for confirmation before deleting a post", () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <NewsEditor
        mode="edit"
        teams={[]}
        initial={{ title: "Aviso del club", body_md: "Contenido del aviso." }}
        onSubmit={vi.fn()}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.getByText("¿Eliminar esta noticia?")).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByText("¿Eliminar esta noticia?")).not.toBeInTheDocument();
  });
});
