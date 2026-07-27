import { describe, expect, it } from "vitest";

import { getProfilePermissionLinks } from "@/components/profile/profile-permission-links";

describe("profile permission links", () => {
  it("shows only the granted management areas", () => {
    const links = getProfilePermissionLinks(["manage_shop", "manage_news"]);

    expect(links.map((link) => link.href)).toEqual(["/admin/shop", "/admin/news"]);
  });

  it("does not duplicate attendance, which has its own coach workspace", () => {
    expect(getProfilePermissionLinks(["manage_attendance"])).toEqual([]);
  });
});
