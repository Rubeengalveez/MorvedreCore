import { afterEach, describe, it, expect, vi } from "vitest";
import { captureException } from "@/lib/monitoring/error-logger";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("privacy-safe error logging", () => {
  it("records only diagnostic metadata and a numeric Next digest", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => undefined);
    captureException(Object.assign(new TypeError("private details"), { digest: "123456789" }), {
      area: "app-error-boundary",
    });
    const record = JSON.parse(output.mock.calls[0][0]);
    expect(record).toMatchObject({
      level: "error",
      event: "application_exception",
      name: "TypeError",
      digest: "123456789",
      context: { area: "app-error-boundary" },
    });
    expect(Number.isNaN(Date.parse(record.timestamp))).toBe(false);
    expect(record).not.toHaveProperty("message");
    expect(record).not.toHaveProperty("stack");
  });

  it("does not leak nested credentials, names, request data or error text", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const secret = "sensitive-fixture-value";
    const error = Object.assign(new Error(secret), { digest: secret, name: secret });
    captureException(error, {
      password: secret,
      userId: secret,
      email: secret,
      data: { access_token: secret },
      request: { headers: { authorization: secret } },
      route: secret,
      area: secret,
    });
    const text = output.mock.calls[0][0];
    expect(text).not.toContain(secret);
    expect(JSON.parse(text)).toMatchObject({ name: "Error", context: {} });
    expect(JSON.parse(text)).not.toHaveProperty("digest");
  });

  it("handles circular objects, BigInt and hostile getters without breaking the error screen", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const context: Record<string, unknown> = { amount: BigInt(1) };
    context.self = context;
    Object.defineProperty(context, "area", {
      get() {
        throw new Error("private getter");
      },
    });
    const error = new Proxy(
      {},
      {
        get() {
          throw new Error("private proxy");
        },
      },
    );
    expect(() => captureException(error, context)).not.toThrow();
    expect(JSON.parse(output.mock.calls[0][0])).toMatchObject({ name: "Error", context: {} });
  });

  it.each([undefined, null, "private thrown string", BigInt(1)])(
    "handles non-Error thrown values without serializing them",
    (error) => {
      const output = vi.spyOn(console, "error").mockImplementation(() => undefined);
      expect(() => captureException(error)).not.toThrow();
      expect(output.mock.calls[0][0]).not.toContain("private thrown string");
    },
  );

  it("records the supported export route and ignores arbitrary extra fields", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => undefined);
    captureException(new Error(), {
      route: "treasury-closure-export",
      digest: "123",
      normalField: "unreviewed content",
    });
    expect(JSON.parse(output.mock.calls[0][0])).toMatchObject({
      digest: "123",
      context: { route: "treasury-closure-export" },
    });
    expect(output.mock.calls[0][0]).not.toContain("unreviewed content");
  });

  it("does not send the original error to an undeclared external SDK", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const send = vi.fn();
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://example.test/not-a-real-dsn");
    const original = Object.getOwnPropertyDescriptor(window, "Sentry");
    Object.defineProperty(window, "Sentry", {
      configurable: true,
      value: { captureException: send },
    });
    try {
      captureException(new Error("private payload"));
      expect(send).not.toHaveBeenCalled();
    } finally {
      if (original) Object.defineProperty(window, "Sentry", original);
      else Reflect.deleteProperty(window, "Sentry");
    }
  });

  it("does not throw if the logging destination fails", () => {
    vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("console unavailable");
    });
    expect(() => captureException(new Error())).not.toThrow();
  });
});
