import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OfflinePage from "@/app/offline/page";

describe("OfflinePage", () => {
  it("renders the offline explanation and Morvedre branding", () => {
    render(<OfflinePage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Estás sin conexión/i);
    expect(
      screen.getByText(/Puedes continuar un acta que hayas preparado en este móvil/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reintentar conexión/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Volver a la pantalla anterior/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ir a la portada del club/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("calls window.history.back when clicking back button", () => {
    const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});
    render(<OfflinePage />);

    const backButton = screen.getByRole("button", { name: /Volver a la pantalla anterior/i });
    fireEvent.click(backButton);

    expect(backSpy).toHaveBeenCalled();
    backSpy.mockRestore();
  });
});
