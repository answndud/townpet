import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("remaining compact user control accessibility", () => {
  it("keeps notification center item actions mobile-safe", () => {
    const code = readSource("src/components/notifications/notification-center.tsx");

    expect(code).toContain("notification-move");
    expect(code).toContain("inline-flex min-h-10");
    expect(code).not.toContain("min-h-9 px-3 py-1.5");
  });

  it("keeps notification bell popover actions mobile-safe and announced", () => {
    const code = readSource("src/components/notifications/notification-bell.tsx");

    expect(code).toContain("min-h-10");
    expect(code).toContain("min-w-10");
    expect(code).toContain('role="alert"');
    expect(code).toContain('aria-live="polite"');
    expect(code).not.toContain("h-7 items-center");
    expect(code).not.toContain("h-6 w-6");
    expect(code).not.toContain("h-9 w-full");
  });

  it("keeps saved-post search inputs mobile-safe", () => {
    const sources = [
      "src/app/bookmarks/page.tsx",
      "src/app/my-posts/page.tsx",
    ].map(readSource).join("\n");

    expect(sources).toContain("min-h-10 w-full");
    expect(sources).toContain("rounded-md bg-[#3567b5]");
    expect(sources).toContain("hover:underline hover:underline-offset-4");
    expect(sources).not.toContain("tp-input-soft h-9");
    expect(sources).not.toContain("tp-btn-primary");
    expect(sources).not.toContain("tp-btn-soft");
    expect(sources).not.toContain("tp-btn-md");
  });

  it("keeps profile and relation controls mobile-safe with status announcements", () => {
    const sources = [
      "src/components/profile/profile-social-account-connections.tsx",
      "src/components/user/user-relation-controls.tsx",
    ].map(readSource).join("\n");

    expect(sources).toContain("min-h-10");
    expect(sources).toContain('role="status"');
    expect(sources).toContain('aria-live="polite"');
    expect(sources).not.toContain("min-h-9 items-center");
  });
});
