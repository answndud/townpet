type CommentListResponse<T> = {
  ok: boolean;
  data?: T[];
  error?: { message?: string };
};

export async function fetchPostComments<T>(postId: string) {
  const response = await fetch(`/api/posts/${postId}/comments`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = (await response.json()) as CommentListResponse<T>;
  return unwrapCommentListResponse(response.ok, payload);
}

export function unwrapCommentListResponse<T>(
  responseOk: boolean,
  payload: CommentListResponse<T>,
) {
  if (!responseOk || !payload.ok) {
    throw new Error(payload.error?.message ?? "댓글 로딩 실패");
  }

  return payload.data ?? [];
}
