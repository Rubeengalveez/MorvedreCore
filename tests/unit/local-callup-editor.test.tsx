import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LocalCallupEditor } from "@/components/matches/local-callup-editor";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/lib/pwa/live-match-store", () => ({
  readLocalMatch: mocks.read,
  writeLocalMatch: vi.fn(),
  liveDevice: () => "device",
}));
vi.mock("@/server/actions/live-match", () => ({
  loadLiveMatch: vi.fn(),
  syncLiveMatch: vi.fn(),
}));
vi.mock("@/app/(app)/admin/matches/[id]/_components/callup-editor", () => ({
  CallupEditor: () => null,
}));
vi.mock("@/components/ui/page-shell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
afterEach(cleanup);

it("libera la pestaña si sales mientras todavía se está leyendo la convocatoria", async () => {
  history.replaceState(
    {},
    "",
    "/acta/convocatoria?match=00000000-0000-4000-8000-000000000801&from=acta",
  );
  let respond!: (value: unknown) => void;
  let released = false;
  mocks.read.mockReturnValue(
    new Promise((resolve) => {
      respond = resolve;
    }),
  );
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: async (_name: string, _options: unknown, run: (lock: object) => Promise<void>) => {
        await run({});
        released = true;
      },
    },
  });
  const view = render(<LocalCallupEditor />);
  view.unmount();
  await act(async () => {
    respond({
      canEdit: true,
      revision: 1,
      device: "device",
      sheet: { phase: "playing", pending: null },
    });
  });
  expect(released).toBe(true);
});
