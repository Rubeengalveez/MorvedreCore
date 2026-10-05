import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AvatarEditor } from "@/components/profile/avatar-editor";
const change = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn().mockReturnValue("blob:profile-test"),
  });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 256,
    height: 256,
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    bottom: 256,
    right: 256,
    toJSON: () => ({}),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function open() {
  render(
    <AvatarEditor name="Pepe López" currentUrl={null} teamColor="#1657a8" onChange={change} />,
  );
  const input = screen.getByLabelText("Elegir foto de perfil") as HTMLInputElement;
  const file = new File(["fixture"], "photo.png", { type: "image/png" });
  fireEvent.change(input, { target: { files: [file] } });
  return input;
}
it("descartar un recorte no cambia la foto ni impide volver a elegir el mismo archivo", () => {
  const input = open();
  expect(screen.getByRole("dialog")).toHaveTextContent("Ajustar foto");
  expect(change).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(change).not.toHaveBeenCalled();
  fireEvent.change(input, {
    target: { files: [new File(["fixture"], "photo.png", { type: "image/png" })] },
  });
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
});
it("rechaza otros formatos antes de preparar una foto", () => {
  render(
    <AvatarEditor name="Pepe López" currentUrl={null} teamColor="#1657a8" onChange={change} />,
  );
  fireEvent.change(screen.getByLabelText("Elegir foto de perfil"), {
    target: { files: [new File(["fixture"], "photo.gif", { type: "image/gif" })] },
  });
  expect(screen.getByRole("alert")).toHaveTextContent("JPG o PNG");
  expect(change).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("el recorte respeta el encuadre visible y se guarda solo como borrador", async () => {
  const draw = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: draw,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) =>
    callback(new Blob(["jpeg"], { type: "image/jpeg" })),
  );
  Object.defineProperty(HTMLImageElement.prototype, "decode", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  open();
  const preview = screen.getByAltText("Encuadre de tu foto");
  Object.defineProperty(preview, "naturalWidth", { configurable: true, value: 360 });
  Object.defineProperty(preview, "naturalHeight", { configurable: true, value: 600 });
  fireEvent.load(preview);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Mover foto a la derecha" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Usar esta foto" }));
  await waitFor(() => expect(change).toHaveBeenCalledOnce());
  expect(draw.mock.calls[0].slice(1)).toEqual([
    0,
    expect.closeTo(120, 6),
    360,
    360,
    0,
    0,
    512,
    512,
  ]);
  expect(change.mock.calls[0][0]).toBeInstanceOf(File);
  expect(change.mock.calls[0][1]).toBe(false);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Foto preparada para guardar");
});
it("quitar una foto es reversible hasta confirmar el guardado del perfil", () => {
  render(
    <AvatarEditor
      name="Pepe López"
      currentUrl="https://example.test/photo.jpg"
      teamColor="#1657a8"
      onChange={change}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Quitar foto" }));
  expect(change).toHaveBeenLastCalledWith(null, true);
  fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
  expect(change).toHaveBeenLastCalledWith(null, false);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
