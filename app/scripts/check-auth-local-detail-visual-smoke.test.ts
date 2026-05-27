import { PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  authLocalGuestGateResultPassed,
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

  it("requires guest access to show the login gate and hide protected detail title", () => {
    expect(
      authLocalGuestGateResultPassed({
        targetType: PostType.HOSPITAL_REVIEW,
        targetTitle: "병원 후기 상세 화면 검증용 안전 정보",
        url: "https://townpet.vercel.app/posts/post-1/guest",
        screenshot: "/tmp/HOSPITAL_REVIEW-guest-gate-mobile.png",
        hasLoginGate: true,
        hidesProtectedTitle: true,
        noHorizontalOverflow: true,
      }),
    ).toBe(true);

    expect(
      authLocalGuestGateResultPassed({
        targetType: PostType.HOSPITAL_REVIEW,
        targetTitle: "병원 후기 상세 화면 검증용 안전 정보",
        url: "https://townpet.vercel.app/posts/post-1/guest",
        screenshot: "/tmp/HOSPITAL_REVIEW-guest-gate-mobile.png",
        hasLoginGate: true,
        hidesProtectedTitle: false,
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
      guestGateResults: [
        {
          targetType: PostType.HOSPITAL_REVIEW,
          targetTitle: "병원 후기 상세 화면 검증용 안전 정보",
          url: "https://townpet.vercel.app/posts/post-1/guest",
          screenshot: "/tmp/HOSPITAL_REVIEW-guest-gate-mobile.png",
          hasLoginGate: true,
          hidesProtectedTitle: true,
          noHorizontalOverflow: true,
        },
      ],
    });

    expect(markdown).toContain("HOSPITAL_REVIEW` requires login");
    expect(markdown).toContain("CARE_REQUEST` requires matching local neighborhood");
    expect(markdown).toContain("## Guest Gate");
    expect(markdown).toContain("protected title hidden");
  });
});
