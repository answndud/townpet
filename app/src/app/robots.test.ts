import { describe, expect, it } from "vitest";

import robots from "@/app/robots";

function getDisallowRules() {
  const rules = robots().rules;
  const rule = Array.isArray(rules) ? rules[0] : rules;
  const disallow = rule?.disallow;
  return Array.isArray(disallow) ? disallow : disallow ? [disallow] : [];
}

describe("robots", () => {
  it("publishes the local sitemap URL", () => {
    expect(robots().sitemap).toBe("http://localhost:3000/sitemap/0.xml");
    expect(robots().host).toBe("http://localhost:3000");
  });

  it("keeps private, auth, admin, and API routes out of crawler access", () => {
    expect(getDisallowRules()).toEqual(
      expect.arrayContaining([
        "/admin/",
        "/api/",
        "/login",
        "/register",
        "/onboarding",
        "/password/",
        "/profile",
        "/notifications",
        "/bookmarks",
        "/saved",
        "/my-posts",
        "/users/",
      ]),
    );
  });
});
