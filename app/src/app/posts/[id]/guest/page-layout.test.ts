import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("guest post detail layout", () => {
  const source = () =>
    readFileSync(join(process.cwd(), "src/app/posts/[id]/guest/page.tsx"), "utf8");

  it("keeps auxiliary info cells as compact divider rows", () => {
    const code = source();

    expect(code).toContain("tp-card p-4 sm:p-5");
    expect(code).toContain("mt-3 grid gap-x-3 gap-y-2");
    expect(code).toContain("tp-border-soft border-t py-2.5");
    expect(code).toContain('aria-label="게시글 메뉴"');
    expect(code).toContain("min-w-[260px] rounded-md border bg-white p-2");
    expect(code).toContain("formatKoreanDate(createdAt)");
    expect(code).toContain("authorDisplayLabel");
    expect(code).toContain("max-w-[760px]");
    expect(code).toContain("sm:[&_img]:max-w-[640px]");
    expect(code).toContain("[&_figure]:!mx-0");
    expect(code).toContain("[&_p]:text-left");
    expect(code).toContain('align="center"');
    expect(code).toContain("sm:grid-cols-[1fr_auto_1fr]");
    expect(code).not.toContain("tp-card p-5 sm:p-6");
    expect(code).not.toContain("mt-4 grid gap-3");
    expect(code).not.toContain("rounded-[14px] border border-[#e8eff9] bg-[#fbfdff] p-3");
    expect(code).not.toContain("border border-[#dde7f5] bg-[#f8fbff] px-3 py-3");
    expect(code).not.toContain("border border-[#cfe9dc] bg-[#f3fbf7] px-3 py-3");
    expect(code).not.toContain("border border-[#f0dfb8] bg-[#fffaf0] px-3 py-3");
    expect(code).not.toContain("border border-[#d6e7b3] bg-[#f8fff0] px-3 py-3");
  });
});
