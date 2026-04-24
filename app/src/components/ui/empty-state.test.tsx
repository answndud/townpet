import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/ui/empty-state";

describe("EmptyState", () => {
  it("renders shared eyebrow copy and primary action style", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="비어 있습니다"
        description="아직 데이터가 없습니다."
        actionHref="/feed"
        actionLabel="피드로 이동"
      />,
    );

    expect(html).toContain("현재 상태");
    expect(html).toContain("tp-eyebrow");
    expect(html).toContain("tp-btn-primary tp-btn-md");
    expect(html).toContain("text-left");
  });
});
