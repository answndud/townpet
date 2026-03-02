"use client";

import { useEffect } from "react";

type PostDetailErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PostDetailError({ error, reset }: PostDetailErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="tp-card p-6 text-center">
      <h2 className="text-lg font-semibold text-[#153a6a]">
        게시글을 불러오지 못했습니다.
      </h2>
      <p className="mt-2 text-sm text-[#5a7398]">잠시 후 다시 시도해 주세요.</p>
      <button
        type="button"
        onClick={reset}
        className="tp-btn-primary mt-4 px-4 py-2 text-sm font-semibold"
      >
        다시 시도
      </button>
    </div>
  );
}
