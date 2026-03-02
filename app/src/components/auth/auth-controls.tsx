"use client";

import { signOut } from "next-auth/react";
import { useTransition } from "react";

type AuthControlsProps = {
  label: string;
};

export function AuthControls({ label }: AuthControlsProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="tp-btn-soft px-3 py-1.5 text-xs font-medium"
      onClick={() =>
        startTransition(async () => {
          await signOut({ callbackUrl: "/login" });
        })
      }
      disabled={isPending}
    >
      {isPending ? "로그아웃 중..." : label}
    </button>
  );
}
