import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("GuestSearchPageClient layout", () => {
  const source = () =>
    readFileSync(join(process.cwd(), "src/components/posts/guest-search-page-client.tsx"), "utf8");

  it("shows operator source context in result rows", () => {
    const code = source();

    expect(code).toContain("OperatorContentBadge");
    expect(code).toContain("buildOperatorContentMetaLabel");
    expect(code).toContain("operatorSourceName?: string | null");
    expect(code).toContain("operatorLastVerifiedAt?: string | Date | null");
    expect(code).not.toContain("인기 콘텐츠");
  });
});
