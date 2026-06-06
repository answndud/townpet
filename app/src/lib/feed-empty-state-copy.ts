type FeedEmptyMode = "ALL" | "BEST";

type ResolveFeedEmptyStateCopyParams = {
  mode: FeedEmptyMode;
  isGuestTypeBlocked: boolean;
  hasQuery: boolean;
};

export function resolveFeedEmptyStateCopy({
  mode,
  isGuestTypeBlocked,
  hasQuery,
}: ResolveFeedEmptyStateCopyParams) {
  if (isGuestTypeBlocked) {
    return {
      eyebrow: "로그인 필요",
      title: "로그인이 필요합니다",
      description: "해당 게시판은 로그인 후 확인할 수 있습니다.",
      actionLabel: "로그인",
      secondaryActionLabel: undefined,
    };
  }

  if (hasQuery) {
    return {
      eyebrow: "검색 결과",
      title: "검색 결과가 없습니다",
      description:
        mode === "BEST"
          ? "인기글 안에서 조건에 맞는 글이 아직 없습니다. 검색을 지우거나 전체글로 범위를 넓혀보세요."
          : "조건에 맞는 글이 없습니다. 검색어를 바꾸거나 필터를 줄여보세요.",
      actionLabel: "검색 초기화",
      secondaryActionLabel: mode === "BEST" ? "전체글" : undefined,
    };
  }

  if (mode === "BEST") {
    return {
      eyebrow: "인기글",
      title: "인기글을 준비 중입니다",
      description:
        "좋아요 기준을 통과한 글이 생기면 날짜 제한 없이 여기에 모입니다. 지금은 전체글에서 병원, 산책, 분실 정보를 먼저 확인하세요.",
      actionLabel: "전체글",
      secondaryActionLabel: undefined,
    };
  }

  return {
    eyebrow: "게시글",
    title: "게시글이 없습니다",
    description: "글을 작성하거나 다른 게시판을 확인해 주세요.",
    actionLabel: "첫 글 작성하기",
    secondaryActionLabel: undefined,
  };
}
