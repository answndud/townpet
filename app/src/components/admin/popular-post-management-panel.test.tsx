import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PopularPostManagementPanel } from "@/components/admin/popular-post-management-panel";

vi.mock("@/server/actions/policy", () => ({
  unpromotePopularPostAction: vi.fn(),
}));

describe("PopularPostManagementPanel", () => {
  it("renders compact popular post management rows", () => {
    const html = renderToStaticMarkup(
      <PopularPostManagementPanel
        posts={[
          {
            id: "post-1",
            title: "동물병원 후기",
            typeLabel: "병원 후기",
            authorLabel: "townpet-admin",
            promotedAtLabel: "2026.06.01 10:00",
            likeCount: 12,
            commentCount: 3,
            viewCount: 44,
          },
        ]}
      />,
    );

    expect(html).toContain("현재 인기글 1개");
    expect(html).toContain("동물병원 후기");
    expect(html).toContain("인기글 해제");
    expect(html).toContain("해제해도 글 자체와 좋아요 수는 유지됩니다.");
  });

  it("renders empty management state without a destructive button", () => {
    const html = renderToStaticMarkup(<PopularPostManagementPanel posts={[]} />);

    expect(html).toContain("현재 수동 관리할 인기글이 없습니다.");
    expect(html).not.toContain("인기글 해제");
  });
});
