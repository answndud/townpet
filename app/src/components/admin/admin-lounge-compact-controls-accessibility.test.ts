import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("remaining lounge and admin compact controls accessibility", () => {
  it("keeps breed lounge filters and pagination at the 40px touch target baseline", () => {
    const code = readSource("src/app/lounges/breeds/[breedCode]/page.tsx");

    expect(code).toContain("tp-input-soft min-h-10");
    expect(code).toContain("inline-flex min-h-10");
    expect(code).toContain("min-w-10");
    expect(code).not.toContain("h-8 items-center");
    expect(code).not.toContain("min-w-8");
    expect(code).not.toContain("tp-input-soft h-8");
  });

  it("keeps breed groupbuy form inputs mobile-safe and announces submit errors", () => {
    const code = readSource("src/components/lounges/breed-groupbuy-form.tsx");

    expect(code).toContain("tp-input-soft min-h-10");
    expect(code).toContain("min-h-24 w-full");
    expect(code).toContain('role="alert"');
    expect(code).toContain('aria-live="polite"');
    expect(code).not.toContain("inline-flex h-9 items-center");
  });

  it("keeps report actions and queue controls mobile-safe with status announcements", () => {
    const code = [
      "src/components/admin/report-actions.tsx",
      "src/components/admin/report-queue-table.tsx",
    ].map(readSource).join("\n");

    expect(code).toContain("min-h-10");
    expect(code).toContain("h-5 w-5");
    expect(code).toContain('role="status"');
    expect(code).toContain('aria-live="polite"');
    expect(code).not.toContain("min-h-9");
    expect(code).not.toContain("sm:h-9");
  });

  it("keeps admin report and care feedback filters/actions away from compact button classes", () => {
    const code = [
      "src/app/admin/reports/page.tsx",
      "src/app/admin/care-feedbacks/page.tsx",
    ].map(readSource).join("\n");

    expect(code).toContain("inline-flex min-h-10");
    expect(code).toContain("min-h-24 w-full");
    expect(code).not.toContain("min-h-9");
    expect(code).not.toContain("tp-btn-xs");
    expect(code).not.toContain("tp-btn-sm");
  });
});
