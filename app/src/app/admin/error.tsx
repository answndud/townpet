"use client";

import { useEffect } from "react";
import Link from "next/link";

import {
  ERROR_STATE_PRIMARY_ACTION_CLASS_NAME,
  ERROR_STATE_TEXT_ACTION_CLASS_NAME,
  ErrorState,
} from "@/components/ui/error-state";

type AdminErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      eyebrow="관리자 오류"
      title="관리자 화면을 불러오지 못했습니다."
      description="잠시 후 다시 시도하거나 운영 overview로 이동해 상태를 다시 확인해 주세요."
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
            href="/admin/ops"
            className={ERROR_STATE_TEXT_ACTION_CLASS_NAME}
          >
            운영 overview
          </Link>
        </>
      }
    />
  );
}
