"use client";

import { useEffect } from "react";
import Link from "next/link";

import { ErrorState } from "@/components/ui/error-state";

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
            className="tp-btn-primary inline-flex min-h-11 items-center justify-center px-4 py-2 text-sm font-semibold"
          >
            다시 시도
          </button>
          <Link
            href="/feed"
            className="tp-btn-soft inline-flex min-h-11 items-center justify-center px-4 py-2 text-sm font-semibold"
          >
            피드로 이동
          </Link>
        </>
      }
    />
  );
}
