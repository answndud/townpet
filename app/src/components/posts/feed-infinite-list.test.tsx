import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  FeedInfiniteList,
  type FeedPostItem,
} from "@/components/posts/feed-infinite-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    prefetch: vi.fn(),
  }),
}));

const basePost: FeedPostItem = {
  id: "post-1",
  type: "FREE_POST",
  scope: "GLOBAL",
  status: "ACTIVE",
  title: "피드 글 제목",
  content: "본문",
  commentCount: 0,
  likeCount: 0,
  dislikeCount: 0,
  viewCount: 0,
  createdAt: "2026-05-21T00:00:00.000Z",
  author: {
    id: "user-1",
    nickname: "작성자",
  },
  neighborhood: null,
  petType: null,
  images: [],
  reactions: [],
};

describe("FeedInfiniteList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders compact title-first rows without body content or thumbnail columns", () => {
    const posts: FeedPostItem[] = [
      basePost,
      {
        ...basePost,
        id: "post-2",
        title: "이미지가 있는 피드 글",
        commentCount: 4,
        images: [{ id: "image-1", url: "/media/sample.jpg" }],
      },
    ];

    const html = renderToStaticMarkup(
      <FeedInfiniteList
        initialItems={posts}
        initialNextCursor={null}
        mode="ALL"
        query={{ scope: "GLOBAL" }}
        queryKey="feed-test"
      />,
    );

    expect(html.match(/data-testid="feed-post-item"/g)).toHaveLength(2);
    expect(html).toContain("min-h-[46px] min-w-0 flex-wrap items-center");
    expect(html).toContain("flex min-w-0 w-full flex-1 items-center gap-2");
    expect(html).not.toContain("sample.jpg");
    expect(html).not.toContain("본문");
    expect(html).not.toContain("자유게시판");
    expect(html).toContain("작성자");
    expect(html).toContain("5.21");
    expect(html).not.toContain("댓글 4");
    expect(html).not.toContain("조회");
    expect(html).not.toContain("좋아요");
  });

  it("keeps the feed row focused on author and date metadata", () => {
    const html = renderToStaticMarkup(
      <FeedInfiniteList
        initialItems={[
          {
            ...basePost,
            author: {
              ...basePost.author,
              isFoundingMember: true,
            },
          },
        ]}
        initialNextCursor={null}
        mode="ALL"
        query={{ scope: "GLOBAL" }}
        queryKey="feed-test"
      />,
    );

    expect(html).toContain("작성자");
    expect(html).not.toContain("창립 멤버");
  });

  it("keeps operator source details out of compact feed rows", () => {
    const html = renderToStaticMarkup(
      <FeedInfiniteList
        initialItems={[
          {
            ...basePost,
            isOperatorContent: true,
            operatorSourceName: "TownPet 운영자 정리",
            operatorLastVerifiedAt: "2026-05-24T00:00:00.000Z",
          },
        ]}
        initialNextCursor={null}
        mode="ALL"
        query={{ scope: "GLOBAL" }}
        queryKey="feed-test"
      />,
    );

    expect(html).toContain("작성자");
    expect(html).not.toContain("TownPet 운영자 정리");
    expect(html).not.toContain("확인");
    expect(html).toContain("min-h-[46px] min-w-0 flex-wrap items-center");
  });

  it("keeps lost-found detail and role actions out of feed rows", () => {
    const html = renderToStaticMarkup(
      <FeedInfiniteList
        initialItems={[
          {
            ...basePost,
            id: "lost-found-1",
            type: "LOST_FOUND",
            title: "망원동 강아지 목격 제보",
            lostFoundAlert: {
              alertType: "FOUND",
              petType: "강아지",
              breed: "말티즈",
              lastSeenAt: "2026-05-24T11:30:00.000Z",
              lastSeenLocation: "망원동 공원 북문",
              status: "ACTIVE",
            },
          },
        ]}
        initialNextCursor={null}
        mode="ALL"
        query={{ scope: "GLOBAL" }}
        queryKey="feed-test"
        preferGuestDetail
      />,
    );

    expect(html).toContain("망원동 강아지 목격 제보");
    expect(html).not.toContain("망원동 공원 북문");
    expect(html).not.toContain("공유 도구");
    expect(html).not.toContain("목격 제보</a>");
    expect(html).not.toContain("tp-btn");
  });

  it("keeps personalized ad CTA in the compact primary action hierarchy", () => {
    const posts = Array.from({ length: 5 }, (_, index) => ({
      ...basePost,
      id: `post-${index + 1}`,
      title: `피드 글 ${index + 1}`,
    }));

    const html = renderToStaticMarkup(
      <FeedInfiniteList
        initialItems={posts}
        initialNextCursor={null}
        mode="ALL"
        query={{ scope: "GLOBAL", personalized: true }}
        queryKey="feed-test"
        adConfig={{
          audienceKey: "default",
          headline: "동네 산책 코스 모음",
          description: "동물 게시판 기준으로 정리된 글입니다.",
          ctaLabel: "자세히",
          ctaHref: "/feed?personalized=1",
          sessionCap: 1,
          dailyCap: 3,
        }}
      />,
    );

    expect(html).toContain("맞춤 추천");
    expect(html).toContain("rounded-md bg-[#3567b5]");
    expect(html).not.toContain("tp-btn-primary mt-2 inline-flex items-center px-3 py-1");
  });
});
