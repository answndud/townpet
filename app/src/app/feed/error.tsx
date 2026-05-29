"use client";

import { useEffect } from "react";
import Link from "next/link";

import { ErrorState } from "@/components/ui/error-state";

type FeedErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const FEED_ERROR_PRIMARY_ACTION_CLASS_NAME =
  "inline-flex min-h-10 items-center justify-center rounded-md bg-[#3567b5] px-4 text-[12px] font-semibold text-[#fbfdff] transition hover:bg-[#2f5da4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";

const FEED_ERROR_TEXT_ACTION_CLASS_NAME =
  "tp-text-muted inline-flex min-h-10 items-center justify-center px-2 text-[12px] font-semibold transition hover:text-[#2f5da4] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";

export default function FeedError({ error, reset }: FeedErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      eyebrow="피드 오류"
      title="피드를 불러오지 못했습니다."
      description="네트워크 상태를 확인한 뒤 다시 시도하거나 게스트 피드로 이동해 주세요."
      actions={
        <>
          <button
            type="button"
            onClick={reset}
            className={FEED_ERROR_PRIMARY_ACTION_CLASS_NAME}
          >
            다시 시도
          </button>
          <Link
            href="/feed/guest"
            className={FEED_ERROR_TEXT_ACTION_CLASS_NAME}
          >
            게스트 피드
          </Link>
        </>
      }
    />
  );
}
