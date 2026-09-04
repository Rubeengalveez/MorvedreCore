import { describe, it, expect, vi } from "vitest";
import { captureException } from "@/lib/monitoring/error-logger";

describe("error-logger", () => {
  it("sanitizes sensitive fields like passwords and tokens", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    captureException(new Error("Test error"), {
      userId: "user-123",
      password: "SuperSecretPassword123!",
      token: "jwt-token-xyz",
      normalField: "visible",
    });

    expect(consoleSpy).toHaveBeenCalled();
    const loggedJson = JSON.parse(consoleSpy.mock.calls[0][0] as string);

    expect(loggedJson.level).toBe("error");
    expect(loggedJson.message).toBe("Test error");
    expect(loggedJson.context.password).toBe("[REDACTED]");
    expect(loggedJson.context.token).toBe("[REDACTED]");
    expect(loggedJson.context.normalField).toBe("visible");
    expect(loggedJson.context.userId).toBe("user-123");

    consoleSpy.mockRestore();
  });
});
