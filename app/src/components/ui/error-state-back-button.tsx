"use client";

import { useRouter } from "next/navigation";

import { ERROR_STATE_TEXT_ACTION_CLASS_NAME } from "@/components/ui/error-state";

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
      className={ERROR_STATE_TEXT_ACTION_CLASS_NAME}
    >
      {children}
    </button>
  );
}
