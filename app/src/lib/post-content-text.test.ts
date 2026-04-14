import { describe, expect, it } from "vitest";

import {
  buildPostContentExcerpt,
  extractPostContentPlainText,
} from "@/lib/post-content-text";

describe("post-content-text", () => {
  it("strips inline image markdown and keeps surrounding text", () => {
    expect(
      extractPostContentPlainText("첫 문단\n\n![강아지](/uploads/dog.png){width=320}\n\n둘째 문단"),
    ).toBe("첫 문단 둘째 문단");
  });

  it("uses rendered link labels instead of markdown syntax in excerpts", () => {
    expect(
      buildPostContentExcerpt(
        "산책 기록은 [여기](https://townpet.dev/walk) 참고\n\n![지도](/uploads/map.png)",
        100,
      ),
    ).toBe("산책 기록은 여기 참고");
  });
});
