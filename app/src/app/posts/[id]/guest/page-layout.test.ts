import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("guest post detail layout", () => {
  const source = () =>
    readFileSync(join(process.cwd(), "src/app/posts/[id]/guest/page.tsx"), "utf8");
  const engagementSource = () =>
    readFileSync(join(process.cwd(), "src/components/posts/guest-post-engagement-bar.tsx"), "utf8");

  it("keeps auxiliary info cells as compact divider rows", () => {
    const code = source();

    expect(code).toContain("tp-card p-4 sm:p-5");
    expect(code).toContain("mt-3 grid gap-x-3 gap-y-2");
    expect(code).toContain("tp-border-soft border-t py-2.5");
    expect(code).toContain("<GuestPostOverflowMenu");
    expect(
      readFileSync(join(process.cwd(), "src/components/posts/guest-post-overflow-menu.tsx"), "utf8"),
    ).toContain('aria-label="게시글 메뉴"');
    expect(
      readFileSync(join(process.cwd(), "src/components/posts/guest-post-overflow-menu.tsx"), "utf8"),
    ).toContain("min-w-[260px] rounded-md border bg-white p-2");
    expect(code).toContain("formatKoreanDate(createdAt)");
    expect(code).toContain("authorDisplayLabel");
    expect(code).toContain("max-w-[760px]");
    expect(code).toContain("sm:[&_img]:max-w-[640px]");
    expect(code).toContain("[&_figure]:!mx-0");
    expect(code).toContain("[&_p]:text-left");
    expect(code).toContain("<GuestPostEngagementBar");
    expect(code).not.toContain("PostReactionControls");
    expect(code).not.toContain("PostBookmarkButton");
    expect(code).not.toContain("PostShareControls");
    expect(engagementSource()).toContain("sm:grid-cols-[1fr_auto_1fr]");
    expect(engagementSource()).toContain("북마크는 로그인 후 저장할 수 있습니다.");
    expect(engagementSource()).toContain("게시글 공유 링크 복사");
    expect(code).not.toContain("tp-card p-5 sm:p-6");
    expect(code).not.toContain("mt-4 grid gap-3");
    expect(code).not.toContain("rounded-[14px] border border-[#e8eff9] bg-[#fbfdff] p-3");
    expect(code).not.toContain("border border-[#dde7f5] bg-[#f8fbff] px-3 py-3");
    expect(code).not.toContain("border border-[#cfe9dc] bg-[#f3fbf7] px-3 py-3");
    expect(code).not.toContain("border border-[#f0dfb8] bg-[#fffaf0] px-3 py-3");
    expect(code).not.toContain("border border-[#d6e7b3] bg-[#f8fff0] px-3 py-3");
  });

  it("keeps lost-found guest detail actions visible before share and comments", () => {
    const code = source();
    const lostFoundInfoIndex = code.indexOf("분실/목격 제보 정보");
    const sharePanelIndex = code.indexOf("<DeferredLostFoundSharePanel");
    const commentSectionIndex = code.indexOf("<DeferredPostCommentSection");

    expect(lostFoundInfoIndex).toBeGreaterThan(0);
    expect(lostFoundInfoIndex).toBeLessThan(sharePanelIndex);
    expect(sharePanelIndex).toBeLessThan(commentSectionIndex);
    expect(code).toContain("다음 행동");
    expect(code).toContain("보호자 또는 공유자");
    expect(code).toContain("공개 문구로 주변에 공유");
    expect(code).toContain('href="#lost-found-share-tools"');
    expect(code).toContain("목격자");
    expect(code).toContain("위치, 시간, 이동 방향을 댓글의 목격 제보로 남깁니다.");
    expect(code).toContain('href="#comments"');
    expect(code).toContain("제보 확인 기준");
    expect(code).toContain("민감한 목격 위치와 사진은 댓글의 보호자 공개 제보로 남깁니다.");
  });
});
