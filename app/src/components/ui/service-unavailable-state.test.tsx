import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ServiceUnavailableState } from "@/components/ui/service-unavailable-state";

describe("ServiceUnavailableState", () => {
  it("renders recovery copy and action links for temporary backend failures", () => {
    const html = renderToStaticMarkup(
      <ServiceUnavailableState
        title="게시판 연결이 지연됐습니다"
        description="목록 데이터 연결이 지연되고 있습니다. 잠시 후 다시 시도하거나 피드로 돌아가 다른 글을 확인해 주세요."
        primaryHref="/boards/adoption"
        primaryLabel="다시 시도"
        secondaryHref="/feed"
        secondaryLabel="피드로 이동"
      />,
    );

    expect(html).toContain("일시 지연");
    expect(html).toContain("게시판 연결이 지연됐습니다");
    expect(html).toContain("목록 데이터 연결이 지연되고 있습니다");
    expect(html).toContain("href=\"/boards/adoption\"");
    expect(html).toContain("href=\"/feed\"");
  });
});
