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
      description:
        "인기글 안에서 조건에 맞는 글이 아직 없습니다. 검색을 지우거나 전체글로 범위를 넓혀보세요.",
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
      title: "인기글을 준비 중입니다",
      description:
        "좋아요 기준을 통과한 글이 생기면 날짜 제한 없이 여기에 모입니다. 지금은 전체글에서 병원, 산책, 분실 정보를 먼저 확인하세요.",
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
