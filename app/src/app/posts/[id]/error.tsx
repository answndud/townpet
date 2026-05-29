"use client";

import { useEffect } from "react";
import Link from "next/link";

import {
  ERROR_STATE_PRIMARY_ACTION_CLASS_NAME,
  ERROR_STATE_TEXT_ACTION_CLASS_NAME,
  ErrorState,
} from "@/components/ui/error-state";

type PostDetailErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PostDetailError({ error, reset }: PostDetailErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      eyebrow="게시글 오류"
      title="게시글을 불러오지 못했습니다."
      description="잠시 후 다시 시도하거나 피드로 돌아가 다른 글을 확인해 주세요."
      actions={
        <>
          <button
            type="button"
            onClick={reset}
            className={ERROR_STATE_PRIMARY_ACTION_CLASS_NAME}
          >
            다시 시도
          </button>
          <Link
            href="/feed"
            className={ERROR_STATE_TEXT_ACTION_CLASS_NAME}
          >
            피드로 이동
          </Link>
        </>
      }
    />
  );
}
