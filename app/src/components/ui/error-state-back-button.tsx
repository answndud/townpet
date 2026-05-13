"use client";

import { useRouter } from "next/navigation";

type ErrorStateBackButtonProps = {
  children?: string;
};

export function ErrorStateBackButton({
  children = "이전 페이지",
}: ErrorStateBackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="tp-btn-soft inline-flex min-h-11 items-center justify-center px-4 py-2 text-sm font-semibold"
    >
      {children}
    </button>
  );
}
