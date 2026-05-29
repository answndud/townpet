import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  buildOperatorContentMetaLabel,
  OperatorContentSourcePanel,
} from "@/components/posts/operator-content-source-panel";

describe("OperatorContentSourcePanel", () => {
  it("links correction requests to the post correction flow", () => {
    const html = renderToStaticMarkup(
      <OperatorContentSourcePanel
        postId="post-1"
        sourceName="TownPet 운영자 정리"
        sourceUrl="https://example.com/source"
        lastVerifiedAt="2026-05-24T00:00:00.000Z"
      />,
    );

    expect(html).toContain("운영자 정리");
    expect(html).toContain("이 정보 정정 요청");
    expect(html).toContain('href="/corrections/new?postId=post-1&amp;targetType=POST"');
    expect(html).toContain("hidden sm:inline-flex");
    expect(html).toContain("mt-3 sm:hidden");
    expect(html).toContain("최종 확인");
    expect(html).toContain("2026-05-24");
    expect(html).not.toContain("/commercial#contact");
    expect(html).not.toContain("tp-btn-soft");
    expect(html).not.toContain("rounded-xl border");
  });

  it("builds compact source and verification labels", () => {
    expect(
      buildOperatorContentMetaLabel({
        sourceName: "TownPet 운영자 정리",
        lastVerifiedAt: "2026-05-24T00:00:00.000Z",
      }),
    ).toBe("TownPet 운영자 정리 · 2026-05-24 확인");
    expect(
      buildOperatorContentMetaLabel({
        sourceName: null,
        lastVerifiedAt: null,
      }),
    ).toBe("운영팀 확인");
  });
});
