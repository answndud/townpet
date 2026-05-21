"use client";

import { useEffect } from "react";
import Link from "next/link";

import { ErrorState } from "@/components/ui/error-state";

type FeedErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

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
            className="tp-btn-primary inline-flex h-[30px] items-center justify-center px-3 text-[11px] font-semibold leading-none"
          >
            다시 시도
          </button>
          <Link
            href="/feed/guest"
            className="tp-btn-soft inline-flex h-[30px] items-center justify-center px-3 text-[11px] font-semibold leading-none"
          >
            게스트 피드
          </Link>
        </>
      }
    />
  );
}
