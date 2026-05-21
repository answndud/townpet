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
      "h-[68px] grid-cols-[minmax(0,1fr)_48px]",
    );
    expect(html).toContain("sm:h-[72px]");
    expect(html).toContain("invisible aspect-square rounded-lg");
    expect(html).toContain("사진 글");
  });
});
