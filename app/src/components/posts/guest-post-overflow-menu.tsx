"use client";

import Link from "next/link";
import { type ComponentType, useState } from "react";

import { DismissibleDetails } from "@/components/ui/dismissible-details";

type GuestPostOverflowMenuProps = {
  postId: string;
  canReportPost: boolean;
  isGuestPost: boolean;
  loginHref: string;
};

export function GuestPostOverflowMenu({
  postId,
  canReportPost,
  isGuestPost,
  loginHref,
}: GuestPostOverflowMenuProps) {
  const [shouldLoadGuestActions, setShouldLoadGuestActions] = useState(false);
  const [GuestActions, setGuestActions] =
    useState<ComponentType<{ postId: string }> | null>(null);

  if (!canReportPost && !isGuestPost) {
    return null;
  }

  const loadGuestActions = () => {
    if (!isGuestPost || shouldLoadGuestActions) {
      return;
    }
    setShouldLoadGuestActions(true);
    void import("@/components/posts/guest-post-detail-actions").then((module) => {
      setGuestActions(() => module.GuestPostDetailActions);
    });
  };

  return (
    <DismissibleDetails className="relative shrink-0">
      <summary
        aria-label="게시글 메뉴"
        className="tp-text-muted inline-flex min-h-10 min-w-10 cursor-pointer list-none items-center justify-center text-[16px] leading-none transition hover:text-[#1f4f8f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
        onClick={loadGuestActions}
      >
        ···
      </summary>
      <div className="tp-border-muted absolute right-0 z-20 mt-1.5 min-w-[260px] rounded-md border bg-white p-2 shadow-[0_8px_18px_rgba(16,40,74,0.08)]">
        {canReportPost ? (
          <div className="rounded-md px-1 py-1.5 text-[12px] leading-5 text-[#355988]">
            <p className="font-semibold text-rose-700">게시글 신고</p>
            <p className="mt-1">
              게시글 신고는 로그인 후 접수할 수 있습니다.{" "}
              <Link
                href={loginHref}
                className="inline-flex font-semibold leading-none text-[#2f5da4] underline underline-offset-2"
                data-dismissible-details-close
              >
                로그인하기
              </Link>
            </p>
          </div>
        ) : null}
        {isGuestPost && GuestActions ? (
          <GuestActions postId={postId} />
        ) : isGuestPost && shouldLoadGuestActions ? (
          <div className="mt-1 border-t border-[#e8eff9] px-1 pt-2 text-[12px] text-[#6a84ac]">
            비회원 글 관리 도구를 준비하는 중...
          </div>
        ) : null}
      </div>
    </DismissibleDetails>
  );
}
