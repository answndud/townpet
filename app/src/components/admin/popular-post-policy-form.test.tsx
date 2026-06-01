import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  parsePopularPostMinLikesInput,
  PopularPostPolicyForm,
} from "@/components/admin/popular-post-policy-form";

vi.mock("@/server/actions/policy", () => ({
  updatePopularPostPolicyAction: vi.fn(),
}));

describe("parsePopularPostMinLikesInput", () => {
  it("accepts integer values inside the policy range", () => {
    expect(parsePopularPostMinLikesInput("7")).toEqual({ ok: true, value: 7 });
  });

  it("rejects empty, fractional, and out-of-range values with actionable copy", () => {
    expect(parsePopularPostMinLikesInput("")).toEqual({
      ok: false,
      message: "인기글 기준을 입력해 주세요.",
    });
    expect(parsePopularPostMinLikesInput("2.5")).toEqual({
      ok: false,
      message: "좋아요 기준은 정수로 입력해 주세요.",
    });
    expect(parsePopularPostMinLikesInput("101")).toEqual({
      ok: false,
      message: "좋아요 기준은 1~100 사이로 입력해 주세요.",
    });
  });
});

describe("PopularPostPolicyForm", () => {
  it("renders the saved threshold, range guidance, and mobile-safe submit", () => {
    const html = renderToStaticMarkup(<PopularPostPolicyForm initialPolicy={{ minLikes: 3 }} />);

    expect(html).toContain("현재 적용: 좋아요 3개 이상");
    expect(html).toContain("1~100 사이 정수만 저장할 수 있습니다.");
    expect(html).toContain("이미 승격된 글은 인기글에 남습니다.");
    expect(html).toContain("aria-describedby=\"popular-post-policy-min-likes-help\"");
    expect(html).toContain("min-h-10");
    expect(html).toContain("w-full");
  });
});
