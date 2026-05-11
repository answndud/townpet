import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  AdoptionListingFields,
  CareRequestFields,
  HospitalReviewFields,
  MarketListingFields,
  PlaceReviewFields,
  StructuredFieldSection,
  StructuredFieldDatalists,
  VolunteerRecruitmentFields,
  WalkRouteFields,
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

  it("renders review and route structured controls", () => {
    const formState = createInitialPostCreateFormState("");
    const setFormState = vi.fn();
    const html = [
      <HospitalReviewFields key="hospital" formState={formState} setFormState={setFormState} />,
      <PlaceReviewFields key="place" formState={formState} setFormState={setFormState} />,
      <WalkRouteFields key="walk" formState={formState} setFormState={setFormState} />,
    ]
      .map((element) => renderToStaticMarkup(element))
      .join("");

    expect(html).toContain("병원후기 정보");
    expect(html).toContain("진료 항목");
    expect(html).toContain("장소 후기 정보");
    expect(html).toContain("동반 가능 여부");
    expect(html).toContain("산책 코스 정보");
    expect(html).toContain("편의 시설");
  });

  it("renders adoption and volunteer structured controls", () => {
    const formState = createInitialPostCreateFormState("");
    const setFormState = vi.fn();
    const html = [
      <AdoptionListingFields key="adoption" formState={formState} setFormState={setFormState} />,
      <VolunteerRecruitmentFields key="volunteer" formState={formState} setFormState={setFormState} />,
    ]
      .map((element) => renderToStaticMarkup(element))
      .join("");

    expect(html).toContain("입양 정보");
    expect(html).toContain("보호소명");
    expect(html).toContain("진행 상태");
    expect(html).toContain("봉사 모집 정보");
    expect(html).toContain("봉사 일정");
    expect(html).toContain("모집 상태");
  });

  it("renders structured field datalists", () => {
    const html = renderToStaticMarkup(<StructuredFieldDatalists />);

    expect(html).toContain('id="hospital-treatment-type-options"');
    expect(html).toContain('id="structured-region-options"');
    expect(html).toContain('id="adoption-animal-type-options"');
    expect(html).toContain('id="volunteer-type-options"');
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
