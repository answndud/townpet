import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("guest search zero-result recovery", () => {
  it("offers a write path and search reset when no results are found", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/posts/guest-search-page-client.tsx"),
      "utf8",
    );

    expect(source).toContain('actionLabel="새 글로 정보 보태기"');
    expect(source).toContain('actionHref="/posts/new"');
    expect(source).toContain('secondaryActionHref="/search/guest"');
  });
});
