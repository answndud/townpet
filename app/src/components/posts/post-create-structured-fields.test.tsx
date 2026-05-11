import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  CareRequestFields,
  MarketListingFields,
  StructuredFieldSection,
} from "@/components/posts/post-create-structured-fields";
import { createInitialPostCreateFormState } from "@/components/posts/post-create-form-state";

describe("post create structured fields", () => {
  it("renders the shared structured field section shell", () => {
    const html = renderToStaticMarkup(
      <StructuredFieldSection title="테스트 섹션">
        <span>필드</span>
      </StructuredFieldSection>,
    );

    expect(html).toContain("테스트 섹션");
    expect(html).toContain("필드");
    expect(html).toContain("tp-card");
  });

  it("renders market listing controls", () => {
    const html = renderToStaticMarkup(
      <MarketListingFields
        formState={createInitialPostCreateFormState("")}
        setFormState={vi.fn()}
      />,
    );

    expect(html).toContain("마켓 거래 정보");
    expect(html).toContain("거래 유형");
    expect(html).toContain("가격(원)");
    expect(html).toContain('value="SELL"');
  });

  it("renders care request controls", () => {
    const html = renderToStaticMarkup(
      <CareRequestFields
        formState={createInitialPostCreateFormState("")}
        setFormState={vi.fn()}
      />,
    );

    expect(html).toContain("돌봄 요청 정보");
    expect(html).toContain("요청 유형");
    expect(html).toContain("시작 시간");
    expect(html).toContain('value="WALK"');
  });
});
