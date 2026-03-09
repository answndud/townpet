type PostCommentCountSyncPayload = {
  postId: string;
  count: number;
};

const POST_COMMENT_COUNT_SYNC_EVENT = "townpet:post-comment-count-sync";

export function emitPostCommentCountSync(payload: PostCommentCountSyncPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<PostCommentCountSyncPayload>(POST_COMMENT_COUNT_SYNC_EVENT, {
      detail: payload,
    }),
  );
}

export function subscribePostCommentCountSync(
  listener: (payload: PostCommentCountSyncPayload) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const custom = event as CustomEvent<PostCommentCountSyncPayload>;
    listener(custom.detail);
  };

  window.addEventListener(POST_COMMENT_COUNT_SYNC_EVENT, handler as EventListener);
  return () => {
    window.removeEventListener(POST_COMMENT_COUNT_SYNC_EVENT, handler as EventListener);
  };
}
