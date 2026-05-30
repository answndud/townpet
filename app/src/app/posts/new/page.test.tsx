import { renderToStaticMarkup } from "react-dom/server";
import { PostType } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: "user-1",
      nickname: "작성자",
    },
  }),
}));

vi.mock("@/server/auth", () => ({
  getCurrentUserRole: vi.fn().mockResolvedValue({ role: "USER" }),
}));

vi.mock("@/server/nickname-guard", () => ({
  redirectToProfileIfNicknameMissing: vi.fn(),
}));

vi.mock("@/server/queries/community.queries", () => ({
  listCommunities: vi.fn().mockResolvedValue({
    items: [],
  }),
}));

vi.mock("@/server/queries/user.queries", () => ({
  getUserWithNeighborhoods: vi.fn().mockResolvedValue({
    neighborhoods: [],
  }),
}));

vi.mock("@/components/posts/post-create-form", () => ({
  PostCreateForm: vi.fn((props) => (
    <div
      data-initial-content={props.initialTemplate?.content ?? ""}
      data-initial-default-alert={props.initialTemplate?.defaults?.lostFound?.alertType ?? ""}
      data-initial-default-difficulty={props.initialTemplate?.defaults?.walkRoute?.difficulty ?? ""}
      data-initial-default-large-dog={props.initialTemplate?.defaults?.walkRoute?.largeDogFriendly ?? ""}
      data-initial-template={props.initialTemplate?.id ?? ""}
      data-initial-title={props.initialTemplate?.title ?? ""}
      data-initial-type={props.initialType ?? ""}
    />
  )),
}));

import NewPostPage from "@/app/posts/new/page";

describe("NewPostPage", () => {
  it("passes template query parameters to the writing form", async () => {
    const html = renderToStaticMarkup(
      await NewPostPage({
        searchParams: Promise.resolve({
          template: "walk_route_large_dog",
          town: "서울 강남구",
          type: PostType.WALK_ROUTE,
        }),
      }),
    );

    expect(html).toContain('data-initial-template="walk_route_large_dog"');
    expect(html).toContain('data-initial-type="WALK_ROUTE"');
    expect(html).toContain("서울 강남구 산책코스 제보해요");
    expect(html).toContain("혼잡한 시간대");
    expect(html).toContain('data-initial-default-difficulty="EASY"');
    expect(html).toContain('data-initial-default-large-dog="true"');
    expect(html).toContain("글 작성");
    expect(html).toContain("p-3.5");
    expect(html).toContain("hover:underline hover:underline-offset-4");
    expect(html).not.toContain("tp-btn-soft inline-flex h-[28px]");
    expect(html).not.toContain("자동 임시저장");
  });

  it("explains lost-found first actions without changing policy boundaries", async () => {
    const html = renderToStaticMarkup(
      await NewPostPage({
        searchParams: Promise.resolve({
          type: PostType.LOST_FOUND,
        }),
      }),
    );

    expect(html).toContain("분실/목격 제보 작성");
    expect(html).toContain("보호자는 분실 글을 작성");
    expect(html).toContain("목격 제보는 상세 댓글");
    expect(html).toContain("공유는 링크/이미지");
    expect(html).toContain("공개하지 말아야 할 정보");
    expect(html).toContain('data-initial-default-alert="LOST"');
  });
});
