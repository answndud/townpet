import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

type NextHeaderRule = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};

async function getHeaderRules() {
  const headers = nextConfig.headers;
  if (typeof headers !== "function") {
    throw new Error("nextConfig.headers is not configured");
  }
  return (await headers()) as NextHeaderRule[];
}

function getRuleHeader(rule: NextHeaderRule, key: string) {
  return rule.headers.find((header) => header.key === key)?.value;
}

describe("next.config security headers", () => {
  it("applies the static security header bundle to every route", async () => {
    const rules = await getHeaderRules();
    const globalRule = rules.find((rule) => rule.source === "/:path*");

    expect(globalRule).toBeDefined();
    expect(getRuleHeader(globalRule!, "X-Frame-Options")).toBe("DENY");
    expect(getRuleHeader(globalRule!, "X-Content-Type-Options")).toBe("nosniff");
    expect(getRuleHeader(globalRule!, "Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(getRuleHeader(globalRule!, "Permissions-Policy")).toBe(
      "camera=(), geolocation=(), microphone=()",
    );
    expect(getRuleHeader(globalRule!, "Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
  });

  it("keeps public cache rules separate from the global security header rule", async () => {
    const rules = await getHeaderRules();
    const globalRule = rules.find((rule) => rule.source === "/:path*");
    const cacheRules = rules.filter((rule) =>
      rule.headers.some((header) => header.key === "Cache-Control"),
    );

    expect(getRuleHeader(globalRule!, "Cache-Control")).toBeUndefined();
    expect(cacheRules.map((rule) => rule.source)).toEqual(
      expect.arrayContaining([
        "/api/posts",
        "/api/posts/:id/detail",
        "/posts/:id/guest",
        "/uploads/:path*",
        "/media/:path*",
      ]),
    );
    for (const rule of cacheRules) {
      expect(getRuleHeader(rule, "Content-Security-Policy")).toBeUndefined();
    }
  });
});
