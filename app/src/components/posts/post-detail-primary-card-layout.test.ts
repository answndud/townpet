import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("post detail primary card layout", () => {
  const source = () =>
    readFileSync(join(process.cwd(), "src/components/posts/post-detail-primary-card.tsx"), "utf8");

  it("keeps report and mobile management workflows as inline sections", () => {
    const code = source();

    expect(code).toContain("tp-border-soft border-t pt-3");
    expect(code).toContain("tp-border-soft mt-2 flex flex-wrap items-center gap-2 border-t pt-2");
    expect(code).not.toContain("tp-border-soft rounded-lg border bg-white p-3");
    expect(code).not.toContain("tp-border-soft tp-surface-soft mt-2 flex flex-wrap items-center gap-2 rounded-xl border p-2");
  });
});
