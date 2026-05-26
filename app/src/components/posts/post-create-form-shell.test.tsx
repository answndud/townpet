import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  PostCreateEditorFooter,
  PostCreatePolicyAside,
  PostCreateSubmitFooter,
} from "@/components/posts/post-create-form-shell";

describe("post create form shell", () => {
  it("renders policy aside with draft status", () => {
    const html = renderToStaticMarkup(
      <PostCreatePolicyAside
        policySummary="정책 요약"
        draftSavedAt={Date.UTC(2026, 4, 12, 1, 30)}
        draftMessage="저장됨"
      />,
    );

    expect(html).toContain("작성 기준");
    expect(html).toContain("정책 요약");
    expect(html).toContain("등록 전 확인");
    expect(html).not.toContain("24시간");
    expect(html).toContain("저장됨");
    expect(html).toContain("p-3");
  });

  it("renders editor footer draft controls", () => {
    const html = renderToStaticMarkup(
      <PostCreateEditorFooter
        draftSavedAt={null}
        draftMessage={null}
        onClearDraft={vi.fn()}
      />,
    );

    expect(html).toContain("임시저장 삭제");
    expect(html).toContain("임시저장 없음");
  });

  it("renders submit footer with profile guidance for users without local scope", () => {
    const html = renderToStaticMarkup(
      <PostCreateSubmitFooter
        policySummary="정책 요약"
        isAuthenticated
        canUseLocalScope={false}
        isFormInteractive
        isPending={false}
      />,
    );

    expect(html).toContain("정책 요약");
    expect(html).toContain("프로필에서 동네 설정");
    expect(html).toContain("취소");
    expect(html).toContain("등록");
    expect(html).toContain("h-[30px]");
  });

  it("renders pending submit state", () => {
    const html = renderToStaticMarkup(
      <PostCreateSubmitFooter
        policySummary="정책 요약"
        isAuthenticated={false}
        canUseLocalScope={false}
        isFormInteractive
        isPending
      />,
    );

    expect(html).toContain("등록 중...");
    expect(html).not.toContain("프로필에서 동네 설정");
  });
});
