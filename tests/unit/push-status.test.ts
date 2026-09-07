import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ context: vi.fn(), from: vi.fn(), eq: vi.fn(), single: vi.fn() }));
vi.mock("@/server/queries/active-profile", () => ({ getActiveProfileContext: mocks.context }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mocks.from }) }));
import { getPushSubscriptionEnabled } from "@/server/actions/push";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.mockResolvedValue({
    ownProfile: { id: "account", is_active: true },
    activeProfile: { id: "child", is_active: true },
  });
  const query = { select: () => query, eq: mocks.eq, maybeSingle: mocks.single };
  mocks.from.mockReturnValue(query);
  mocks.eq.mockReturnValue(query);
  mocks.single.mockResolvedValue({ data: { enabled: true }, error: null });
});

describe("push status authorization", () => {
  it("queries the account owner rather than a selected family profile", async () => {
    await expect(getPushSubscriptionEnabled("https://push.example.test/device")).resolves.toBe(
      true,
    );
    expect(mocks.eq).toHaveBeenCalledWith("profile_id", "account");
    expect(mocks.eq).toHaveBeenCalledWith("endpoint", "https://push.example.test/device");
  });

  it.each([null, { enabled: false }])(
    "does not activate a missing or disabled subscription",
    async (data) => {
      mocks.single.mockResolvedValue({ data, error: null });
      await expect(getPushSubscriptionEnabled("https://push.example.test/device")).resolves.toBe(
        false,
      );
    },
  );

  it.each([null, { ownProfile: { id: "account", is_active: false } }])(
    "rejects an absent or inactive account",
    async (context) => {
      mocks.context.mockResolvedValue(context);
      await expect(getPushSubscriptionEnabled("https://push.example.test/device")).rejects.toThrow(
        "Inicia sesión",
      );
      expect(mocks.from).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid endpoints before querying", async () => {
    await expect(getPushSubscriptionEnabled("invalid")).rejects.toThrow("no válida");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("does not disguise database failure as an inactive subscription", async () => {
    mocks.single.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    await expect(getPushSubscriptionEnabled("https://push.example.test/device")).rejects.toThrow(
      "No pudimos comprobar",
    );
  });
});
