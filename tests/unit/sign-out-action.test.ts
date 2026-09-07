import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  from: vi.fn(),
  eq: vi.fn(),
  update: vi.fn(),
  getUser: vi.fn(),
  disabled: {
    data: [{ id: "device" }] as { id: string }[] | null,
    error: null as { message: string } | null,
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { signOut: mocks.signOut, getUser: mocks.getUser },
    from: mocks.from,
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/email/resend", () => ({ sendAdminAccessRequestNotification: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import { signOut } from "@/server/actions/auth";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-owner" } } });
  mocks.disabled = { data: [{ id: "device" }], error: null };
  mocks.from.mockImplementation((table) => {
    const chain = {
      select: () => (table === "profiles" ? chain : Promise.resolve(mocks.disabled)),
      eq: (column: string, value: string) => {
        mocks.eq(column, value);
        return chain;
      },
      update: (value: unknown) => {
        mocks.update(value);
        return chain;
      },
      maybeSingle: async () => ({ data: { id: "profile-owner" }, error: null }),
    };
    return chain;
  });
});

it("only disables the current owner's selected device and signs out locally", async () => {
  await expect(
    signOut({ endpoint: "https://push.example.test/device", localPushRemoved: false }),
  ).resolves.toEqual({});
  expect(mocks.eq).toHaveBeenCalledWith("auth_user_id", "auth-owner");
  expect(mocks.eq).toHaveBeenCalledWith("profile_id", "profile-owner");
  expect(mocks.eq).toHaveBeenCalledWith("endpoint", "https://push.example.test/device");
  expect(mocks.update).toHaveBeenCalledWith({ enabled: false });
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
});

it("does not report logout when neither side can remove push", async () => {
  mocks.disabled = { data: null, error: { message: "unavailable" } };
  expect(
    await signOut({ endpoint: "https://push.example.test/device", localPushRemoved: false }),
  ).toHaveProperty("error");
  expect(mocks.signOut).not.toHaveBeenCalled();
});

it("can sign out after confirmed browser removal despite a server cleanup failure", async () => {
  mocks.disabled = { data: null, error: { message: "unavailable" } };
  await expect(
    signOut({ endpoint: "https://push.example.test/device", localPushRemoved: true }),
  ).resolves.toEqual({});
  expect(mocks.signOut).toHaveBeenCalledOnce();
});

it("treats a missing subscription row as unconfirmed removal", async () => {
  mocks.disabled = { data: [], error: null };
  expect(await signOut({ endpoint: "https://push.example.test/device" })).toHaveProperty("error");
  expect(mocks.signOut).not.toHaveBeenCalled();
});

it("surfaces an authentication sign-out failure", async () => {
  mocks.signOut.mockResolvedValue({ error: { message: "unavailable" } });
  expect(await signOut()).toHaveProperty("error");
});

it("validates endpoint input before querying", async () => {
  expect(await signOut({ endpoint: "invalid" })).toHaveProperty("error");
  expect(mocks.from).not.toHaveBeenCalled();
  expect(mocks.signOut).not.toHaveBeenCalled();
});
