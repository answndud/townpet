import { describe, expect, it } from "vitest";

import { ADMIN_SECTION_LINKS } from "@/components/admin/admin-section-nav";

describe("admin section nav", () => {
  it("includes the core moderator destinations including ops", () => {
    const hrefs = ADMIN_SECTION_LINKS.map((item) => item.href);

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
});
