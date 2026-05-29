import { ReportTarget } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  BOOKMARK_LOGIN_REQUIRED_MESSAGE,
  COMMENT_LOGIN_REQUIRED_MESSAGE,
  COMMENT_REACTION_LOGIN_REQUIRED_MESSAGE,
  GUEST_COMMENT_GUIDE_BODY,
  MEMBER_COMMENT_GUIDE_BODY,
  POST_REACTION_LOGIN_REQUIRED_MESSAGE,
  buildReportLoginRequiredMessage,
} from "@/lib/interaction-auth-copy";

describe("interaction auth copy", () => {
  it("keeps login-required action messages consistent", () => {
    expect(COMMENT_LOGIN_REQUIRED_MESSAGE).toBe(
      "댓글 작성, 답글, 신고는 로그인 후 이용할 수 있습니다.",
    );
    expect(POST_REACTION_LOGIN_REQUIRED_MESSAGE).toBe(
      "게시글 좋아요/싫어요는 로그인 후 이용할 수 있습니다.",
    );
    expect(COMMENT_REACTION_LOGIN_REQUIRED_MESSAGE).toBe(
      "댓글 좋아요/싫어요는 로그인 후 이용할 수 있습니다.",
    );
    expect(BOOKMARK_LOGIN_REQUIRED_MESSAGE).toBe(
      "북마크는 로그인 후 저장할 수 있습니다.",
    );
  });

  it("separates guest and member comment ownership copy", () => {
    expect(GUEST_COMMENT_GUIDE_BODY).toContain("비회원 댓글을 수정/삭제");
    expect(MEMBER_COMMENT_GUIDE_BODY).toContain("로그인한 계정으로 댓글이 등록");
  });

  it("builds report login messages by target type", () => {
    expect(buildReportLoginRequiredMessage(ReportTarget.POST)).toBe(
      "게시글 신고는 로그인 후 접수할 수 있습니다.",
    );
    expect(buildReportLoginRequiredMessage(ReportTarget.COMMENT)).toBe(
      "댓글 신고는 로그인 후 접수할 수 있습니다.",
    );
  });
});
