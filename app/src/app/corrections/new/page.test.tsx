import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CorrectionRequestPage, { metadata } from "@/app/corrections/new/page";
import { getCorrectionRequestPostContext } from "@/server/queries/correction-request.queries";

vi.mock("@/server/queries/correction-request.queries", () => ({
  getCorrectionRequestPostContext: vi.fn(),
}));

const mockGetCorrectionRequestPostContext = vi.mocked(getCorrectionRequestPostContext);

describe("CorrectionRequestPage", () => {
  beforeEach(() => {
    mockGetCorrectionRequestPostContext.mockReset();
    mockGetCorrectionRequestPostContext.mockResolvedValue(null);
  });

  it("renders public correction request form with post prefill", async () => {
    const html = renderToStaticMarkup(
      await CorrectionRequestPage({
        searchParams: Promise.resolve({
          postId: "ckc7k5qsj0000u0t8qv6d1d7k",
          targetType: "HOSPITAL",
          targetName: "타운동물병원",
        }),
      }),
    );

    expect(html).toContain("정보 정정 요청");
    expect(html).toContain('action="/api/corrections"');
    expect(html).toContain('name="postId"');
    expect(html).toContain("타운동물병원");
    expect(html).toContain("정정 요청 접수");
  });

  it("renders operator post context and success next actions", async () => {
    mockGetCorrectionRequestPostContext.mockResolvedValue({
      id: "ckc7k5qsj0000u0t8qv6d1d7k",
      title: "동네 병원 운영자 정리",
      type: "HOSPITAL_REVIEW",
      isOperatorContent: true,
      operatorSourceName: "TownPet 운영자 정리",
      operatorLastVerifiedAt: new Date("2026-05-26T12:00:00.000Z"),
    } as never);

    const html = renderToStaticMarkup(
      await CorrectionRequestPage({
        searchParams: Promise.resolve({
          postId: "ckc7k5qsj0000u0t8qv6d1d7k",
          submitted: "correction-1",
        }),
      }),
    );

    expect(html).toContain("운영자 정리 글");
    expect(html).toContain("TownPet 운영자 정리");
    expect(html).toContain("동네 병원 운영자 정리");
    expect(html).toContain('value="POST" selected=""');
    expect(html).toContain("연결 글 다시 보기");
    expect(html).toContain("첫 글 작성하기");
    expect(html).toContain("관련 글 더 보기");
  });

  it("is noindex and canonical to correction request URL", () => {
    expect(metadata.alternates).toMatchObject({ canonical: "/corrections/new" });
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
  });

  it("wires correction flow view and receipt CTA acquisition events", () => {
    const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

    expect(source).toContain("CORRECTION_FLOW_VIEWED");
    expect(source).toContain("CORRECTION_RECEIPT_CTA_CLICKED");
    expect(source).toContain('surface: "CORRECTION_FLOW"');
  });
});
