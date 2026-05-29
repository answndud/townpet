import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  extractPostDetailAttachmentName,
  getPostDetailMediaGridClassName,
  getWrappedPostDetailMediaIndex,
  PostDetailMediaGallery,
} from "@/components/posts/post-detail-media-gallery";

describe("post detail media gallery helpers", () => {
  it("extracts a readable attachment name from local and remote URLs", () => {
    expect(extractPostDetailAttachmentName("/uploads/moka-0.jpg", 0)).toBe("moka-0.jpg");
    expect(extractPostDetailAttachmentName("https://cdn.townpet.dev/media/%E1%84%86%E1%85%A9%E1%84%8F%E1%85%A1.jpg", 1)).toBe(
      "모카.jpg",
    );
  });

  it("returns a single-column layout for one image and a responsive grid for many images", () => {
    expect(getPostDetailMediaGridClassName(1)).toBe("grid-cols-1");
    expect(getPostDetailMediaGridClassName(3)).toBe("grid-cols-1 sm:grid-cols-2 xl:grid-cols-3");
  });

  it("wraps gallery navigation indexes in both directions", () => {
    expect(getWrappedPostDetailMediaIndex(0, -1, 3)).toBe(2);
    expect(getWrappedPostDetailMediaIndex(2, 1, 3)).toBe(0);
    expect(getWrappedPostDetailMediaIndex(0, 1, 0)).toBe(0);
  });
});

describe("PostDetailMediaGallery", () => {
  it("renders thumbnail buttons for lightbox viewing and omits the section when empty", () => {
    const html = renderToStaticMarkup(
      <PostDetailMediaGallery
        images={[
          { url: "/uploads/moka-1.jpg", order: 2 },
          { url: "/uploads/moka-0.jpg", order: 1 },
        ]}
      />,
    );

    expect(html).toContain("첨부 이미지");
    expect(html).toContain("눌러서 크게 보고 원본은 새 탭으로 열 수 있습니다.");
    expect(html).toContain('aria-label="moka-0.jpg 확대"');
    expect(html).toContain("확대");
    expect(html).toContain("mt-2.5 grid gap-2");
    expect(html).toContain("rounded-lg border bg-white");
    expect(html).toContain("border-t border-[#edf3fb] px-2.5 py-1.5");
    expect(html).not.toContain("hover:shadow-[0_12px_28px_rgba(18,47,90,0.08)]");
    expect(html).not.toContain("rounded-2xl border bg-white");
    expect(html).toContain("focus-visible:ring-2");
    expect(html).toContain('src="/uploads/moka-0.jpg"');
    expect(renderToStaticMarkup(<PostDetailMediaGallery images={[]} />)).toBe("");
  });
});
