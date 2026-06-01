import { PostType } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { FeedPersonalizationPolicyForm } from "@/components/admin/feed-personalization-policy-form";
import { ForbiddenKeywordPolicyForm } from "@/components/admin/forbidden-keyword-policy-form";
import { GuestReadPolicyForm } from "@/components/admin/guest-read-policy-form";
import { PopularPostPolicyForm } from "@/components/admin/popular-post-policy-form";

vi.mock("@/server/actions/policy", () => ({
  updateFeedPersonalizationPolicyAction: vi.fn(),
  updateForbiddenKeywordPolicyAction: vi.fn(),
  updateGuestReadPolicyAction: vi.fn(),
  updatePopularPostPolicyAction: vi.fn(),
}));

const personalizationPolicy = {
  recencyDecayStep: 0.12,
  recencyDecayFloor: 0.2,
  personalizedRatio: 0.6,
  personalizedThreshold: 0.12,
  clickSignalMultiplier: 1,
  clickSignalCap: 0.15,
  adSignalMultiplier: 1,
  adSignalCap: 0.12,
  dwellSignalMultiplier: 1,
  dwellSignalCap: 0.18,
  bookmarkSignalMultiplier: 1,
  bookmarkSignalCap: 0.2,
};

describe("admin policy form accessibility", () => {
  it("keeps guest read policy buttons mobile-safe", () => {
    const html = renderToStaticMarkup(
      <GuestReadPolicyForm initialLoginRequiredTypes={[PostType.MARKET_LISTING]} />,
    );

    expect(html).toContain("min-h-10");
    expect(html).toContain("정책 저장");
    expect(html).toContain("모두 공개로 초기화");
  });

  it("keeps forbidden keyword policy buttons mobile-safe", () => {
    const html = renderToStaticMarkup(
      <ForbiddenKeywordPolicyForm initialKeywords={["spam"]} />,
    );

    expect(html).toContain("min-h-10");
    expect(html).toContain("금칙어 저장");
    expect(html).toContain("모두 삭제");
  });

  it("keeps personalization policy submit mobile-safe", () => {
    const html = renderToStaticMarkup(
      <FeedPersonalizationPolicyForm initialPolicy={personalizationPolicy} />,
    );

    expect(html).toContain("min-h-10");
    expect(html).toContain("정책 저장");
  });

  it("keeps popular post policy submit mobile-safe", () => {
    const html = renderToStaticMarkup(<PopularPostPolicyForm initialPolicy={{ minLikes: 3 }} />);

    expect(html).toContain("인기글 승격 기준");
    expect(html).toContain("현재 적용: 좋아요 3개 이상");
    expect(html).toContain("min-h-10");
    expect(html).toContain("정책 저장");
  });
});
