import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  AdoptionListingFields,
  CareRequestFields,
  HospitalReviewFields,
  LostFoundFields,
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

    expect(html).toContain("거래 정보");
    expect(html).toContain("거래 유형");
    expect(html).toContain("가격(원)");
    expect(html).toContain("반려용품 거래 체크");
    expect(html).toContain("border-t border-[#e3ecf8] pt-2");
    expect(html).toContain("유통기한");
    expect(html).toContain("동물 의약품 거래는 등록할 수 없습니다");
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

    expect(html).toContain("병원 후기 정보");
    expect(html).toContain("작성 기준");
    expect(html).toContain("대기, 설명, 비용, 재방문 의향처럼 직접 겪은 내용만 적어 주세요.");
    expect(html).toContain("진단 단정, 과잉진료 단정, 직원 실명과 연락처는 검토될 수 있습니다.");
    expect(html).toContain("방문 목적");
    expect(html).toContain("동물 종류");
    expect(html).toContain("진료 항목");
    expect(html).toContain("설명 충분성");
    expect(html).toContain("재방문 의향");
    expect(html).toContain("장소 후기 정보");
    expect(html).toContain("동반 가능 여부");
    expect(html).toContain("산책 코스 정보");
    expect(html).toContain("코스 이름보다 혼잡 시간, 목줄 구간, 대형견 적합 여부를 우선 적어 주세요.");
    expect(html).toContain("배변봉투함, 물 마실 곳, 위험 구간이 있으면 함께 남겨 주세요.");
    expect(html).toContain("대형견 적합");
    expect(html).toContain("혼잡 시간");
    expect(html).toContain("목줄 필수 구간");
    expect(html).toContain("위험/공사 구간");
    expect(html).toContain("배변봉투함");
    expect(html).toContain("물 마실 곳");
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

  it("renders lost-found controls", () => {
    const html = renderToStaticMarkup(
      <LostFoundFields
        formState={createInitialPostCreateFormState("")}
        setFormState={vi.fn()}
      />,
    );

    expect(html).toContain("분실/목격 핵심 정보");
    expect(html).toContain("처음 행동 구분");
    expect(html).toContain("보호자는 여기서 분실 글을 작성합니다.");
    expect(html).toContain("목격자는 기존 분실 글의 목격했어요 댓글을 우선 사용합니다.");
    expect(html).toContain("제보 유형");
    expect(html).toContain("마지막 확인 시간");
    expect(html).toContain("마지막 확인 위치");
    expect(html).toContain("위치 공개 기준");
    expect(html).toContain("도로명·번지 주소를 적지 마세요");
    expect(html).toContain("연락이 필요한 단서는 댓글의 보호자 공개 제보로 남깁니다.");
    expect(html).toContain('value="LOST"');
  });
});
