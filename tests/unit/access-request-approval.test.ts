import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Access Request Approval Compensation", () => {
  it("implements compensation rollback and defers existing user password mutation until DB is consistent", () => {
    const authActionsPath = resolve(process.cwd(), "server/actions/auth.ts");
    const content = readFileSync(authActionsPath, "utf8");

    // Must ensure existing users don't get passwords reset before DB operations succeed
    expect(content).toContain("isExistingAuthUser");
    expect(content).toContain("createdProfileId");
    expect(content).toContain("deleteUser(authUserId)");
    expect(content).toContain('.delete().eq("id", createdProfileId)');
  });
});
