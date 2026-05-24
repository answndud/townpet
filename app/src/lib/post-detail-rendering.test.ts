import { describe, expect, it, vi } from "vitest";

import { buildPostDetailMediaRendering, hasRenderedInlineImages } from "@/lib/post-detail-rendering";
import {
  filterRenderableUploadImages,
  resolveRenderableUploadPathnames,
} from "@/server/upload-asset.service";

vi.mock("@/server/upload-asset.service", () => ({
  filterRenderableUploadImages: vi.fn((images, renderableUploadPathnames) =>
    images.filter((image: { url?: string | null }) => {
      const url = image.url ?? "";
      if (!url.startsWith("/media/uploads/")) {
        return Boolean(url);
      }
      return renderableUploadPathnames.has(url.slice("/media/".length));
    }),
  ),
  resolveRenderableUploadPathnames: vi.fn(),
}));

const mockResolveRenderableUploadPathnames = vi.mocked(resolveRenderableUploadPathnames);
const mockFilterRenderableUploadImages = vi.mocked(filterRenderableUploadImages);

describe("post detail rendering", () => {
  it("detects only rendered inline image elements", () => {
    expect(hasRenderedInlineImages("<p>첨부 이미지</p>")).toBe(false);
    expect(hasRenderedInlineImages('<img src="/media/uploads/a.webp" alt="" />')).toBe(true);
  });

  it("filters missing upload images from inline content and gallery images", async () => {
    mockResolveRenderableUploadPathnames.mockResolvedValue(new Set(["uploads/ok.webp"]));

    const result = await buildPostDetailMediaRendering(
      [
        "본문",
        "![정상](/media/uploads/ok.webp)",
        "![누락](/media/uploads/missing.jpg)",
        "![중복경로](/media/media/uploads/legacy.jpg)",
      ].join("\n"),
      [
        { url: "/media/uploads/ok.webp", order: 2 },
        { url: "/media/uploads/missing.jpg", order: 1 },
      ],
    );

    expect(mockResolveRenderableUploadPathnames).toHaveBeenCalledWith([
      "/media/uploads/ok.webp",
      "/media/uploads/missing.jpg",
      "/media/media/uploads/legacy.jpg",
      "/media/uploads/ok.webp",
      "/media/uploads/missing.jpg",
    ]);
    expect(mockFilterRenderableUploadImages).toHaveBeenCalled();
    expect(result.renderedContentHtml).toContain('<img src="/media/uploads/ok.webp"');
    expect(result.renderedContentHtml).not.toContain("/media/uploads/missing.jpg");
    expect(result.renderedContentHtml).toContain("누락");
    expect(result.renderedContentHtml).toContain("중복경로");
    expect(result.renderableImages).toEqual([{ url: "/media/uploads/ok.webp", order: 2 }]);
    expect(result.hasInlineImages).toBe(true);
  });
});
