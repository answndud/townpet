"use client";

import { useEffect } from "react";
import Link from "next/link";

import { ErrorState } from "@/components/ui/error-state";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="tp-page-bg min-h-screen px-4 py-16">
      <main>
        <ErrorState
          eyebrow="오류 발생"
          title="요청을 처리하는 중 문제가 발생했습니다."
          description="잠시 후 다시 시도하거나 피드로 이동해 주세요."
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
      </main>
    </div>
  );
}
