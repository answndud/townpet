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
    "src/components/posts/feed-inline-search-form.tsx",
    "src/components/posts/feed-search-form.tsx",
    "src/components/posts/post-detail-client.tsx",
    "src/components/posts/post-detail-media-gallery.tsx",
    "src/components/posts/post-detail-primary-card.tsx",
    "src/components/posts/post-rich-text-editor-shell.tsx",
  ];

  it("keeps final-sweep interactive controls compact without legacy rounded outline actions", () => {
    const code = interactiveSources.map(readSource).join("\n");

    expect(code).toContain("min-h-10");
    expect(code).not.toContain("tp-btn-xs");
    expect(code).not.toContain("tp-btn-sm");
    expect(code).not.toContain("sm:min-h-8");
    expect(code).not.toContain("sm:min-h-9");
    expect(code).not.toContain("shadow-[inset_0_-2px_0_#3567b5]");
    const detailPrimaryCardCode = readSource("src/components/posts/post-detail-primary-card.tsx");
    const guestDetailCode = readSource("src/app/posts/[id]/guest/page.tsx");
    const actionComponentCode = [
      readSource("src/components/posts/post-bookmark-button.tsx"),
      readSource("src/components/posts/post-share-controls.tsx"),
      readSource("src/components/posts/post-reaction-controls.tsx"),
      readSource("src/components/posts/comment-reaction-controls.tsx"),
    ].join("\n");
    expect(detailPrimaryCardCode).not.toContain("rounded-full border border-[#dbe6f5] bg-white");
    expect(guestDetailCode).not.toContain("rounded-full border border-[#dbe6f5] bg-white");
    expect(actionComponentCode).not.toContain("rounded-full border");
    expect(actionComponentCode).not.toContain("rounded-lg border px-4");
    expect(actionComponentCode).not.toContain("border-[#dbe6f5] bg-white");
  });

  it("keeps post detail transient states compact", () => {
    const code = readSource("src/components/posts/post-detail-client.tsx");

    expect(code).toContain("tp-border-danger-soft tp-surface-danger-soft rounded-lg border p-4 text-center sm:p-5");
    expect(code).toContain("tp-border-soft tp-text-subtle rounded-lg border bg-white p-4 text-center text-sm sm:p-5");
    expect(code).not.toContain("tp-border-danger-soft tp-surface-danger-soft rounded-xl border p-6");
    expect(code).not.toContain("tp-border-soft tp-text-subtle rounded-xl border bg-white p-6");
  });
});
