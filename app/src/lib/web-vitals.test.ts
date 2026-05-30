import { describe, expect, it } from "vitest";

import { getWebVitalRating, normalizeWebVitalRoute } from "@/lib/web-vitals";

describe("web vitals helpers", () => {
  it("normalizes dynamic and high-cardinality routes before storage", () => {
    expect(normalizeWebVitalRoute("/posts/cmp123/guest?foo=bar")).toBe(
      "/posts/[id]/guest",
    );
    expect(normalizeWebVitalRoute("/posts/cmp123")).toBe("/posts/[id]");
    expect(normalizeWebVitalRoute("/users/user-1")).toBe("/users/[id]");
    expect(normalizeWebVitalRoute("/notifications/redirect/noti-1")).toBe(
      "/notifications/redirect/[id]",
    );
    expect(normalizeWebVitalRoute("/media/uploads/a/b/c.png")).toBe("/media/[path]");
    expect(normalizeWebVitalRoute("/sitemap/posts.xml")).toBe("/sitemap/[id].xml");
  });

  it("rates core web vitals with public threshold boundaries", () => {
    expect(getWebVitalRating("LCP", 2500)).toBe("GOOD");
    expect(getWebVitalRating("LCP", 2501)).toBe("NEEDS_IMPROVEMENT");
    expect(getWebVitalRating("LCP", 4001)).toBe("POOR");
    expect(getWebVitalRating("INP", 200)).toBe("GOOD");
    expect(getWebVitalRating("INP", 500)).toBe("NEEDS_IMPROVEMENT");
    expect(getWebVitalRating("CLS", 0.26)).toBe("POOR");
    expect(getWebVitalRating("FCP", 1800)).toBe("GOOD");
    expect(getWebVitalRating("TTFB", 1801)).toBe("POOR");
  });
});
