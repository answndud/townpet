"use client";

import { useEffect, useState } from "react";

import { subscribePostCommentCountSync } from "@/lib/post-comment-count-sync";

type PostCommentCountStatProps = {
  postId: string;
  initialCount: number;
};

export function PostCommentCountStat({
  postId,
  initialCount,
}: PostCommentCountStatProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    return subscribePostCommentCountSync((payload) => {
      if (payload.postId !== postId) {
        return;
      }

      setCount(payload.count);
    });
  }, [postId]);

  return <span>댓글 {count.toLocaleString()}</span>;
}
