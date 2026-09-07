import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DownloadClosureButton } from "@/components/treasury/download-closure-button";

const fetchMock = vi.fn();
const createUrl = vi.fn();
const revokeUrl = vi.fn();
let click: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = createUrl;
      static revokeObjectURL = revokeUrl;
    },
  );
  createUrl.mockReturnValue("blob:closure-download");
  click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  fetchMock.mockResolvedValue(
    new Response(new Uint8Array([80, 75, 3, 4]), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="tesoreria_septiembre.xlsx"',
      },
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("downloads the workbook and releases its local URL on unmount", async () => {
  const view = render(<DownloadClosureButton closureId="closure" />);
  fireEvent.click(screen.getByRole("button", { name: "Descargar Excel" }));
  await waitFor(() => expect(click).toHaveBeenCalledOnce());
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/treasury/closures/closure/export",
    expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
  );
  expect(click.mock.instances[0].download).toBe("tesoreria_septiembre.xlsx");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  view.unmount();
  expect(revokeUrl).toHaveBeenCalledWith("blob:closure-download");
});

it("shows an authorization error on the page without downloading JSON", async () => {
  fetchMock.mockResolvedValue(
    Response.json({ error: "No tienes permiso de tesorería." }, { status: 403 }),
  );
  render(<DownloadClosureButton closureId="closure" />);
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByRole("alert")).toHaveTextContent("No tienes permiso de tesorería.");
  expect(createUrl).not.toHaveBeenCalled();
  expect(click).not.toHaveBeenCalled();
  expect(screen.getByRole("button")).toBeEnabled();
});

it("does not save a login redirect as an Excel file", async () => {
  fetchMock.mockResolvedValue(new Response("login", { headers: { "Content-Type": "text/html" } }));
  render(<DownloadClosureButton closureId="closure" />);
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Comprueba tu sesión");
  expect(createUrl).not.toHaveBeenCalled();
});

it("reports network failure in Spanish and allows another attempt", async () => {
  fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
  render(<DownloadClosureButton closureId="closure" />);
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos descargar el Excel");
  expect(screen.getByRole("button")).toBeEnabled();
  expect(createUrl).not.toHaveBeenCalled();
  fetchMock.mockResolvedValueOnce(
    new Response(new Uint8Array([80, 75, 3, 4]), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    }),
  );
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(click).toHaveBeenCalledOnce());
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("prevents duplicate requests and aborts when leaving the page", async () => {
  fetchMock.mockImplementation(() => new Promise(() => undefined));
  const view = render(<DownloadClosureButton closureId="closure" />);
  const button = screen.getByRole("button");
  fireEvent.click(button);
  fireEvent.click(button);
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(button).toBeDisabled();
  const signal = fetchMock.mock.calls[0][1].signal;
  view.unmount();
  expect(signal.aborted).toBe(true);
});
