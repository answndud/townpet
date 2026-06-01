import { describe, expect, it } from "vitest";

import { resolveFeedEmptyStateCopy } from "@/lib/feed-empty-state-copy";

describe("resolveFeedEmptyStateCopy", () => {
  it("distinguishes popular search empty state from no popular posts state", () => {
    expect(
      resolveFeedEmptyStateCopy({
        mode: "BEST",
        isGuestTypeBlocked: false,
        hasQuery: true,
      }),
    ).toMatchObject({
      eyebrow: "검색 결과",
      title: "검색 결과가 없습니다",
      actionLabel: "검색 초기화",
      secondaryActionLabel: "전체글",
    });

    expect(
      resolveFeedEmptyStateCopy({
        mode: "BEST",
        isGuestTypeBlocked: false,
        hasQuery: false,
      }),
    ).toMatchObject({
      eyebrow: "인기글",
      title: "인기글이 없습니다",
      actionLabel: "전체글",
    });
  });

  it("uses login copy for guest-blocked boards", () => {
    expect(
      resolveFeedEmptyStateCopy({
        mode: "ALL",
        isGuestTypeBlocked: true,
        hasQuery: false,
      }),
    ).toMatchObject({
      eyebrow: "로그인 필요",
      title: "로그인이 필요합니다",
      actionLabel: "로그인",
    });
  });
});
