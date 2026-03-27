import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { getAdminSectionLinks } from "@/components/admin/admin-section-nav";

describe("admin section nav", () => {
  it("shows admin-only destinations for admins", () => {
    const hrefs = getAdminSectionLinks(UserRole.ADMIN).map((item) => item.href);

    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/admin",
        "/admin/ops",
        "/admin/reports",
        "/admin/moderation/direct",
        "/admin/auth-audits",
        "/admin/policies",
      ]),
    );
  });

  it("hides admin-only destinations for moderators", () => {
    const hrefs = getAdminSectionLinks(UserRole.MODERATOR).map((item) => item.href);

    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/admin",
        "/admin/reports",
        "/admin/moderation/direct",
        "/admin/moderation-logs",
        "/admin/hospital-review-flags",
      ]),
    );
    expect(hrefs).not.toContain("/admin/ops");
    expect(hrefs).not.toContain("/admin/auth-audits");
    expect(hrefs).not.toContain("/admin/policies");
    expect(hrefs).not.toContain("/admin/personalization");
    expect(hrefs).not.toContain("/admin/breeds");
  });
});
