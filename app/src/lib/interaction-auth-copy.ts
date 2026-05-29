import { ReportTarget } from "@prisma/client";

import { getReportTargetLabel } from "@/lib/report-target";

export const GUEST_COMMENT_GUIDE_TITLE = "비회원 댓글 작성";
export const GUEST_COMMENT_GUIDE_BODY =
  "닉네임과 비밀번호를 입력하면 비회원 댓글을 수정/삭제할 수 있습니다.";

export const MEMBER_COMMENT_GUIDE_TITLE = "회원 댓글 작성";
export const MEMBER_COMMENT_GUIDE_BODY =
  "로그인한 계정으로 댓글이 등록되며, 내 댓글은 계정 권한으로 관리할 수 있습니다.";

export const COMMENT_LOGIN_REQUIRED_MESSAGE =
  "댓글 작성, 답글, 신고는 로그인 후 이용할 수 있습니다.";

export const POST_REACTION_LOGIN_REQUIRED_MESSAGE =
  "게시글 좋아요/싫어요는 로그인 후 이용할 수 있습니다.";

export const COMMENT_REACTION_LOGIN_REQUIRED_MESSAGE =
  "댓글 좋아요/싫어요는 로그인 후 이용할 수 있습니다.";

export const BOOKMARK_LOGIN_REQUIRED_MESSAGE =
  "북마크는 로그인 후 저장할 수 있습니다.";

export function buildReportLoginRequiredMessage(targetType: ReportTarget) {
  return `${getReportTargetLabel(targetType)} 신고는 로그인 후 접수할 수 있습니다.`;
}
