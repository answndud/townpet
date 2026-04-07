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
    expect(html).toContain("썸네일을 눌러 크게 보고");
    expect(html).toContain('aria-label="moka-0.jpg 크게 보기"');
    expect(html).toContain("확대 보기");
    expect(html).toContain("focus-visible:ring-2");
    expect(html).toContain('src="/uploads/moka-0.jpg"');
    expect(renderToStaticMarkup(<PostDetailMediaGallery images={[]} />)).toBe("");
  });
});
