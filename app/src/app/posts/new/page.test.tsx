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
    expect(html).toContain("서울 강남구 대형견 산책하기 좋은 곳 있나요?");
    expect(html).toContain("혼잡한 시간대");
    expect(html).toContain("글 작성");
    expect(html).toContain("p-3.5");
    expect(html).not.toContain("자동 임시저장");
  });
});
