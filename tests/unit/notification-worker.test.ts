import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  send: vi.fn(),
  update: vi.fn(),
  attempts: vi.fn(),
}));
vi.mock("@/lib/push/service", () => ({ sendPushToSubscription: mocks.send }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: mocks.rpc,
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        single: mocks.attempts,
        update: mocks.update,
        then: (done: (value: unknown) => void) => Promise.resolve({ error: null }).then(done),
      };
      mocks.update.mockReturnValue(query);
      return query;
    },
  }),
}));
import { dispatchNotificationPush } from "@/server/notification-push";
const first = {
  job_id: "first",
  notification: {
    id: "one",
    title: "Ausencia de Pepe",
    body: "Pepe no asistió",
    kind: "training_absence",
    created_at: "2026-10-03T10:00:00Z",
  },
  subscription: { id: "device-one" },
  muted: false,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: [first], error: null });
  mocks.send.mockResolvedValue({ success: true });
  mocks.attempts.mockResolvedValue({ data: { attempts: 1 }, error: null });
});
it("cada dispositivo recibe el texto de su propio aviso", async () => {
  const second = {
    ...first,
    job_id: "second",
    notification: { ...first.notification, id: "two", title: "Nuevo partido" },
    subscription: { id: "device-two" },
  };
  mocks.rpc.mockResolvedValue({ data: [first, second], error: null });
  await dispatchNotificationPush();
  expect(mocks.send).toHaveBeenNthCalledWith(
    1,
    first.subscription,
    expect.objectContaining({ title: "Ausencia de Pepe", href: "/notifications/one" }),
  );
  expect(mocks.send).toHaveBeenNthCalledWith(
    2,
    second.subscription,
    expect.objectContaining({ title: "Nuevo partido", href: "/notifications/two" }),
  );
});
it("un tema desactivado no envía push ni borra el aviso", async () => {
  mocks.rpc.mockResolvedValue({ data: [{ ...first, muted: true }], error: null });
  await dispatchNotificationPush();
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: "skipped" }));
});
it("un fallo temporal programa un reintento", async () => {
  mocks.send.mockResolvedValue({ success: false, retryable: true, error: "timeout" });
  await dispatchNotificationPush();
  expect(mocks.update).toHaveBeenCalledWith(
    expect.objectContaining({ status: "pending", finished_at: null }),
  );
});
it("el quinto fallo no se reintenta indefinidamente", async () => {
  mocks.attempts.mockResolvedValue({ data: { attempts: 5 }, error: null });
  mocks.send.mockResolvedValue({ success: false, retryable: true });
  await dispatchNotificationPush();
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }));
});
