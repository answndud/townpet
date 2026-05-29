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

  it("keeps feed post rows the same fixed height with or without thumbnails", () => {
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
    expect(html).toContain(
      "h-[64px] grid-cols-[minmax(0,1fr)_44px_44px]",
    );
    expect(html).toContain("sm:h-[68px]");
    expect(html).toContain("invisible aspect-square rounded-lg");
    expect(html).toContain("justify-end self-center");
    expect(html).toContain("h-[22px]");
    expect(html).toContain("사진 글");
    expect(html).toContain("댓글 4");
  });

  it("shows a compact founding member badge in the author metadata row", () => {
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

    expect(html).toContain("창립 멤버");
    expect(html).toContain("text-[10px]");
  });

  it("shows compact operator source context without making the row taller", () => {
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

    expect(html).toContain("운영자 정리");
    expect(html).toContain("TownPet 운영자 정리");
    expect(html).toContain("확인");
    expect(html).toContain(
      "h-[64px] grid-cols-[minmax(0,1fr)_44px_44px]",
    );
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
          description: "관심 동물 기준으로 추천된 글입니다.",
          ctaLabel: "자세히 보기",
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
