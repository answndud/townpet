type CommentListResponse<T> = {
  ok: boolean;
  data?: T[];
  error?: { message?: string };
};

export function unwrapCommentListResponse<T>(
  responseOk: boolean,
  payload: CommentListResponse<T>,
) {
  if (!responseOk || !payload.ok) {
    throw new Error(payload.error?.message ?? "댓글 로딩 실패");
  }

  return payload.data ?? [];
}
