import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("post detail info panels accessibility", () => {
  const source = () =>
    readFileSync(join(process.cwd(), "src/components/posts/post-detail-info-panels.tsx"), "utf8");

  it("keeps status and application actions at the 40px touch target baseline", () => {
    const code = source();

    expect(code).toContain("INFO_PANEL_PRIMARY_ACTION_CLASS");
    expect(code).toContain("inline-flex min-h-10");
    expect(code).toContain("INFO_PANEL_SELECT_CLASS");
    expect(code).toContain("mt-1 min-h-10");
    expect(code).not.toContain("px-3 py-1.5 text-xs font-semibold");
  });

  it("announces panel workflow messages", () => {
    const code = source();

    expect(code).toContain('role="status"');
    expect(code).toContain('aria-live="polite"');
    expect(code).toContain("marketStatusMessage");
    expect(code).toContain("careStatusMessage");
    expect(code).toContain("careApplicationMessage");
    expect(code).toContain("careFeedbackMessage");
  });

  it("keeps long text inputs and checkbox controls easier to target", () => {
    const code = source();

    expect(code).toContain("min-h-24 w-full");
    expect(code).toContain("h-5 w-5");
  });

  it("keeps market safety guidance compact in the detail panel", () => {
    const code = source();
    const marketSection = code.slice(
      code.indexOf('{post.marketListing ? ('),
      code.indexOf('{post.careRequest ? ('),
    );

    expect(marketSection).toContain("거래 전 확인");
    expect(marketSection).toContain("col-span-full grid gap-1.5 border-t border-[#e3ecf8] pt-2");
    expect(marketSection).toContain("STATUS_WORKFLOW_SECTION_CLASS");
    expect(marketSection).toContain("거래 상태 변경");
    expect(marketSection).not.toContain("col-span-full rounded-lg border border-[#dbe6f5] bg-[#f8fbff] px-3 py-2");
    expect(marketSection).not.toContain("col-span-full mt-1 rounded-lg border border-[#dce7f6] bg-[#f8fbff] p-3");
  });

  it("keeps hospital review guidance compact in the detail panel", () => {
    const code = source();
    const hospitalSection = code.slice(
      code.indexOf('{post.hospitalReview ? ('),
      code.indexOf('{post.placeReview ? ('),
    );

    expect(hospitalSection).toContain("후기 확인 기준");
    expect(hospitalSection).toContain("개인 경험 공유입니다. 진단이나 법적 판단은 방문 전 병원에 직접 확인하세요.");
    expect(hospitalSection).toContain("정보 정정 요청");
    expect(hospitalSection).toContain("col-span-full grid gap-1.5 border-t border-[#e3ecf8] pt-2");
    expect(hospitalSection).not.toContain(
      "col-span-full rounded-lg border border-[#dbe6f5] bg-[#f8fbff] px-3 py-2",
    );
  });

  it("keeps lost found guidance compact in the detail panel", () => {
    const code = source();
    const lostFoundSection = code.slice(
      code.indexOf('{post.lostFoundAlert ? ('),
      code.indexOf('{post.adoptionListing ? ('),
    );

    expect(lostFoundSection).toContain("제보 확인 기준");
    expect(lostFoundSection).toContain("다음 행동");
    expect(lostFoundSection).toContain("보호자 또는 공유자");
    expect(lostFoundSection).toContain("공유 도구");
    expect(lostFoundSection).toContain("제보 관리");
    expect(lostFoundSection).toContain('href={`/posts/${post.id}/sightings`}');
    expect(lostFoundSection).toContain("목격자");
    expect(lostFoundSection).toContain("목격 제보");
    expect(lostFoundSection).toContain('href="#lost-found-share-tools"');
    expect(lostFoundSection).toContain('href="#comments"');
    expect(lostFoundSection).toContain("허위 제보, 장난 제보, 개인정보 노출은 신고 사유로 선택해 주세요.");
    expect(lostFoundSection).toContain("민감한 목격 위치와 사진은 댓글의 보호자 공개 제보로 남깁니다.");
    expect(lostFoundSection).toContain("col-span-full grid gap-1.5 border-t border-[#ead5a5] pt-2");
    expect(lostFoundSection).toContain("STATUS_WORKFLOW_SECTION_CLASS");
    expect(lostFoundSection).toContain("상태 변경");
    expect(lostFoundSection).not.toContain(
      "col-span-full rounded-lg border border-[#ead5a5] bg-[#fff9e8] px-3 py-2",
    );
    expect(lostFoundSection).not.toContain(
      "col-span-full rounded-lg border border-[#dbe6f5] bg-[#f8fbff] px-3 py-2.5",
    );
  });

  it("keeps care workflow panels compact in the detail panel", () => {
    const code = source();
    const careSection = code.slice(
      code.indexOf('{post.careRequest ? ('),
      code.indexOf('{post.lostFoundAlert ? ('),
    );

    expect(careSection).toContain("CARE_WORKFLOW_SECTION_CLASS");
    expect(careSection).toContain("돌봄 요청 상태 변경");
    expect(careSection).toContain("돌봄 지원");
    expect(careSection).toContain("지원자 관리");
    expect(careSection).toContain("완료 피드백");
    expect(careSection).toContain("grid gap-2 border-t border-[#e2e8f0] pt-2 first:border-t-0 first:pt-0");
    expect(careSection).not.toContain("col-span-full mt-1 rounded-lg border border-[#cfe9dc] bg-[#f3fbf7] p-3");
    expect(careSection).not.toContain("col-span-full mt-1 rounded-lg border border-[#cfe9dc] bg-white p-3");
    expect(careSection).not.toContain("rounded-md border border-[#e2e8f0] bg-[#fbfcfe] p-3");
  });
});
