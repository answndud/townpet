import { PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  authLocalDetailResultPassed,
  buildAuthLocalDetailSmokeMarkdown,
  parseAuthLocalSmokeTypes,
} from "./check-auth-local-detail-visual-smoke";

describe("auth/local detail visual smoke", () => {
  it("defaults to the policy-gated detail types only", () => {
    expect(parseAuthLocalSmokeTypes(undefined)).toEqual([
      PostType.HOSPITAL_REVIEW,
      PostType.CARE_REQUEST,
    ]);
  });

  it("ignores unsupported public smoke types", () => {
    expect(parseAuthLocalSmokeTypes("FREE_BOARD,HOSPITAL_REVIEW,CARE_REQUEST")).toEqual([
      PostType.HOSPITAL_REVIEW,
      PostType.CARE_REQUEST,
    ]);
  });

  it("requires auth detail, expected text, local gate, and overflow checks to pass", () => {
    expect(
      authLocalDetailResultPassed({
        targetType: PostType.CARE_REQUEST,
        targetTitle: "동네 돌봄 요청 상세 화면 검증용 정보",
        profile: "mobile",
        url: "https://townpet.vercel.app/posts/post-1",
        screenshot: "/tmp/CARE_REQUEST-mobile.png",
        titleVisible: true,
        hasCommentSection: true,
        hasReportEntry: true,
        hasExpectedDetailText: true,
        noLocalGate: true,
        noHorizontalOverflow: true,
      }),
    ).toBe(true);

    expect(
      authLocalDetailResultPassed({
        targetType: PostType.CARE_REQUEST,
        targetTitle: "동네 돌봄 요청 상세 화면 검증용 정보",
        profile: "mobile",
        url: "https://townpet.vercel.app/posts/post-1",
        screenshot: "/tmp/CARE_REQUEST-mobile.png",
        titleVisible: true,
        hasCommentSection: true,
        hasReportEntry: true,
        hasExpectedDetailText: true,
        noLocalGate: false,
        noHorizontalOverflow: true,
      }),
    ).toBe(false);
  });

  it("documents why these checks are separate from public smoke", () => {
    const markdown = buildAuthLocalDetailSmokeMarkdown({
      generatedAt: "2026-05-27T00:00:00.000Z",
      baseUrl: "https://townpet.vercel.app",
      requestedTypes: [PostType.HOSPITAL_REVIEW, PostType.CARE_REQUEST],
      results: [],
    });

    expect(markdown).toContain("HOSPITAL_REVIEW` requires login");
    expect(markdown).toContain("CARE_REQUEST` requires matching local neighborhood");
  });
});
