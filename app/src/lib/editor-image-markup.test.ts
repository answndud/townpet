import { describe, expect, it } from "vitest";

import {
  areSameStringArray,
  buildImageMarkdown,
  collapseAdjacentDuplicateImageTokens,
  extractImageUrlsFromMarkup,
  removeImageTokensByUrls,
} from "@/lib/editor-image-markup";

describe("editor-image-markup", () => {
  it("extracts image urls from markdown tokens", () => {
    const urls = extractImageUrlsFromMarkup(
      "텍스트\n![a](https://example.com/a.jpg){width=320}\n![b](/uploads/b.jpg)",
    );

    expect(urls).toEqual(["https://example.com/a.jpg", "/uploads/b.jpg"]);
  });

  it("removes selected image tokens", () => {
    const next = removeImageTokensByUrls(
      "![a](https://example.com/a.jpg)\n\n문단\n\n![b](https://example.com/b.jpg)",
      ["https://example.com/a.jpg"],
    );

    expect(next).toBe("문단\n\n![b](https://example.com/b.jpg)");
  });

  it("builds markdown with index offset", () => {
    const markup = buildImageMarkdown(["/uploads/a.jpg", "/uploads/b.jpg"], 3);
    expect(markup).toContain("![첨부 이미지 3](/uploads/a.jpg)");
    expect(markup).toContain("![첨부 이미지 4](/uploads/b.jpg)");
  });

  it("collapses adjacent duplicate image tokens", () => {
    const markup = collapseAdjacentDuplicateImageTokens(
      [
        "문단",
        "![첨부 이미지 1](/uploads/a.jpg)",
        "![첨부 이미지](/uploads/a.jpg)",
        "![첨부 이미지](/uploads/b.jpg)",
        "![첨부 이미지](/uploads/b.jpg)",
        "다음 문단",
        "![첨부 이미지](/uploads/a.jpg)",
      ].join("\n\n"),
    );

    expect(markup).toBe(
      [
        "문단",
        "![첨부 이미지 1](/uploads/a.jpg)",
        "![첨부 이미지](/uploads/b.jpg)",
        "다음 문단",
        "![첨부 이미지](/uploads/a.jpg)",
      ].join("\n\n"),
    );
  });

  it("compares arrays by order and value", () => {
    expect(areSameStringArray(["a", "b"], ["a", "b"])).toBe(true);
    expect(areSameStringArray(["a", "b"], ["b", "a"])).toBe(false);
  });
});
