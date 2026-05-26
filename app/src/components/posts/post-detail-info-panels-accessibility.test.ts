import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("post detail info panels accessibility", () => {
  const source = () =>
    readFileSync(join(process.cwd(), "src/components/posts/post-detail-info-panels.tsx"), "utf8");

  it("keeps status and application actions at the 40px touch target baseline", () => {
    const code = source();

    expect(code).toContain("INFO_PANEL_PRIMARY_ACTION_CLASS");
    expect(code).toContain("inline-flex min-h-10");
    expect(code).toContain("INFO_PANEL_SELECT_CLASS");
    expect(code).toContain("mt-1 min-h-10");
    expect(code).not.toContain("px-3 py-1.5 text-xs font-semibold");
  });

  it("announces panel workflow messages", () => {
    const code = source();

    expect(code).toContain('role="status"');
    expect(code).toContain('aria-live="polite"');
    expect(code).toContain("marketStatusMessage");
    expect(code).toContain("careStatusMessage");
    expect(code).toContain("careApplicationMessage");
    expect(code).toContain("careFeedbackMessage");
  });

  it("keeps long text inputs and checkbox controls easier to target", () => {
    const code = source();

    expect(code).toContain("min-h-24 w-full");
    expect(code).toContain("h-5 w-5");
  });

  it("keeps market safety guidance compact in the detail panel", () => {
    const code = source();
    const marketSection = code.slice(
      code.indexOf('{post.marketListing ? ('),
      code.indexOf('{post.careRequest ? ('),
    );

    expect(marketSection).toContain("거래 전 확인");
    expect(marketSection).toContain("col-span-full grid gap-1.5 border-t border-[#e3ecf8] pt-2");
    expect(marketSection).not.toContain("col-span-full rounded-lg border border-[#dbe6f5] bg-[#f8fbff] px-3 py-2");
  });
});
