"use client";

import { useEffect } from "react";
import Link from "next/link";

import {
  ERROR_STATE_PRIMARY_ACTION_CLASS_NAME,
  ERROR_STATE_TEXT_ACTION_CLASS_NAME,
  ErrorState,
} from "@/components/ui/error-state";

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
      </main>
    </div>
  );
}
