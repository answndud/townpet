import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("GuestFeedPage", () => {
  it("renders the guest feed from a server payload instead of a page-wide client fetch", () => {
    const code = readSource("src/app/feed/guest/page.tsx");

    expect(code).toContain("buildGuestFeedPageServiceResult");
    expect(code).toContain("<GuestFeedShell data={result.data} />");
    expect(code).not.toContain("GuestFeedPageClient");
    expect(code).not.toContain("fetchJson");
    expect(code).not.toContain("useSearchParams");
  });
});
