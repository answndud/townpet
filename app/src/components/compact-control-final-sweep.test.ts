import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("compact control final sweep", () => {
  const interactiveSources = [
    "src/app/boards/adoption/page.tsx",
    "src/app/bookmarks/page.tsx",
    "src/app/feed/page.tsx",
    "src/app/my-posts/page.tsx",
    "src/app/posts/[id]/guest/page.tsx",
    "src/app/posts/new/page.tsx",
    "src/app/profile/page.tsx",
    "src/components/auth/auth-controls.tsx",
    "src/components/auth/auth-page-layout.tsx",
    "src/components/navigation/app-shell-footer.tsx",
    "src/components/posts/comment-reaction-controls.tsx",
    "src/components/posts/feed-control-panel.tsx",
    "src/components/posts/feed-footer-search-form.tsx",
    "src/components/posts/feed-search-form.tsx",
    "src/components/posts/post-detail-client.tsx",
    "src/components/posts/post-detail-media-gallery.tsx",
    "src/components/posts/post-detail-primary-card.tsx",
    "src/components/posts/post-rich-text-editor-shell.tsx",
  ];

  it("keeps final-sweep interactive controls at the 40px touch target baseline", () => {
    const code = interactiveSources.map(readSource).join("\n");

    expect(code).toContain("min-h-10");
    expect(code).toContain("min-w-10");
    expect(code).not.toContain("tp-btn-xs");
    expect(code).not.toContain("tp-btn-sm");
    expect(code).not.toContain(" h-8 ");
    expect(code).not.toContain(" h-9 ");
    expect(code).not.toContain("min-h-8");
    expect(code).not.toContain("min-h-9");
    expect(code).not.toContain("min-w-8");
    expect(code).not.toContain("sm:min-h-8");
    expect(code).not.toContain("sm:min-h-9");
  });
});
