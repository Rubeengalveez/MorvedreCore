import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  permission: vi.fn(),
  closure: vi.fn(),
  workbook: vi.fn(),
  capture: vi.fn(),
}));
vi.mock("@/server/actions/admin/_helpers", () => ({ requirePermission: mocks.permission }));
vi.mock("@/server/queries/treasury", () => ({ getTreasuryClosure: mocks.closure }));
vi.mock("@/lib/exports/treasury-export", () => ({
  buildTreasuryClosureWorkbook: mocks.workbook,
  treasuryClosureFilename: () => "tesoreria_septiembre.xlsx",
}));
vi.mock("@/lib/monitoring/error-logger", () => ({ captureException: mocks.capture }));

import { GET } from "@/app/api/treasury/closures/[id]/export/route";

const id = "10000000-0000-4000-8000-000000000001";
const download = (closureId = id) =>
  GET(new Request("http://localhost/api/treasury/closures/export"), {
    params: Promise.resolve({ id: closureId }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.permission.mockResolvedValue({ id: "treasurer" });
  mocks.closure.mockResolvedValue({
    closure: { id, period_label: "Septiembre" },
    lines: [{ id: "line" }],
  });
  mocks.workbook.mockReturnValue(Buffer.from([80, 75, 3, 4]));
});

it("allows the modular treasury permission without requiring global administration", async () => {
  const response = await download();
  expect(mocks.permission).toHaveBeenCalledWith("manage_treasury");
  expect(mocks.closure).toHaveBeenCalledWith(id);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("spreadsheetml.sheet");
  expect(response.headers.get("content-disposition")).toBe(
    'attachment; filename="tesoreria_septiembre.xlsx"',
  );
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([80, 75, 3, 4]);
});

it("does not read or export financial data when authorization fails", async () => {
  mocks.permission.mockRejectedValue(new Error("permission denied"));
  const response = await download();
  expect(response.status).toBe(403);
  expect(mocks.closure).not.toHaveBeenCalled();
  expect(mocks.workbook).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it("rejects invalid identifiers before querying closures", async () => {
  const response = await download("not-a-uuid");
  expect(response.status).toBe(400);
  expect(mocks.closure).not.toHaveBeenCalled();
});

it("reports a missing closure without producing an attachment", async () => {
  mocks.closure.mockResolvedValue({ closure: null, lines: [] });
  const response = await download();
  expect(response.status).toBe(404);
  expect(mocks.workbook).not.toHaveBeenCalled();
  expect(response.headers.has("content-disposition")).toBe(false);
});

it.each(["read", "workbook"])(
  "does not return an attachment or sensitive details after a %s failure",
  async (stage) => {
    const sensitiveError = new Error("private financial record details");
    if (stage === "read") mocks.closure.mockRejectedValue(sensitiveError);
    else
      mocks.workbook.mockImplementation(() => {
        throw sensitiveError;
      });
    const response = await download();
    expect(response.status).toBe(503);
    expect(response.headers.has("content-disposition")).toBe(false);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).not.toContain(sensitiveError.message);
    expect(mocks.capture).toHaveBeenCalledOnce();
    expect(mocks.capture.mock.calls[0][0].message).not.toContain(sensitiveError.message);
    if (stage === "read") expect(mocks.workbook).not.toHaveBeenCalled();
  },
);
