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
      className="inline-flex h-8 items-center rounded-sm px-1 text-[14px] leading-none text-[#173963] transition hover:bg-[#dcecff] hover:text-[#0f2f56] disabled:opacity-60"
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
