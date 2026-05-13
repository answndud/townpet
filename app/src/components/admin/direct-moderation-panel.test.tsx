import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DirectModerationPanel } from "@/components/admin/direct-moderation-panel";

describe("DirectModerationPanel", () => {
  it("keeps direct moderation controls mobile-safe", () => {
    const html = renderToStaticMarkup(<DirectModerationPanel />);

    expect(html).toContain("단계적 제재 적용");
    expect(html).toContain("콘텐츠 숨김 실행");
    expect(html).toContain("직접 숨김 복구");
    expect(html.match(/min-h-10/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(html).toContain("flex-wrap");
  });
});
