import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AdminOpsPage source", () => {
  it("renders the correction flow acquisition rollup surface", () => {
    const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

    expect(source).toContain("정정 요청 전환");
    expect(source).toContain("overview.correctionFlow");
    expect(source).toContain("분실/목격 획득 전환");
    expect(source).toContain("overview.lostFoundAcquisition");
    expect(source).toContain("단계별 funnel");
    expect(source).toContain("LOST_FLOW_VIEWED");
    expect(source).toContain("NEXT_PUBLIC_ENABLE_CLIENT_TELEMETRY=1");
    expect(source).toContain("분실/목격 source가 아직 없습니다.");
    expect(source).toContain("sightingCreatedRate");
    expect(source).toContain("정정 화면 조회");
    expect(source).toContain("정정 요청 접수");
    expect(source).toContain("접수 후 CTA");
    expect(source).toContain("receiptCtaClickCount");
    expect(source).toContain("일자별 추세");
    expect(source).toContain("dailySummaries");
    expect(source).toContain("관리자 큐 smoke 준비");
    expect(source).toContain("overview.adminQueueSmoke");
    expect(source).toContain("missingKeys");
    expect(source).toContain("원격 인증 smoke");
    expect(source).toContain("로컬 fixture smoke");
    expect(source).toContain("localFixtureCommand");
  });
});
