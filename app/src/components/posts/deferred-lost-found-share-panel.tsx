"use client";

import { type ComponentType, useState } from "react";

import type { PostDetailItem } from "@/components/posts/post-detail-types";
import { buildLostFoundSharePanelOpenedEvent } from "@/lib/lost-found-acquisition-events";
import { sendAcquisitionEvent } from "@/lib/acquisition-tracking";

type DeferredLostFoundSharePanelProps = {
  post: PostDetailItem;
  postUrl: string;
};

type LostFoundSharePanelComponent = ComponentType<DeferredLostFoundSharePanelProps>;

export function DeferredLostFoundSharePanel({
  post,
  postUrl,
}: DeferredLostFoundSharePanelProps) {
  const [SharePanel, setSharePanel] = useState<LostFoundSharePanelComponent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadSharePanel = () => {
    if (SharePanel || isLoading) {
      return;
    }
    void sendAcquisitionEvent(buildLostFoundSharePanelOpenedEvent(post.id));
    setIsLoading(true);
    void import("@/components/posts/lost-found-share-panel")
      .then((module) => {
        setSharePanel(() => module.LostFoundSharePanel);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  if (SharePanel) {
    return <SharePanel post={post} postUrl={postUrl} />;
  }

  return (
    <section
      id="lost-found-share-tools"
      className="tp-card scroll-mt-20 border-[#d8e4f6] p-4 sm:p-5"
      aria-labelledby="lost-found-share-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4e6f9f]">
            공유 준비
          </p>
          <h2 id="lost-found-share-title" className="mt-1 text-base font-semibold text-[#10284a]">
            주변에 바로 공유하세요
          </h2>
          <p className="mt-1 max-w-[70ch] text-xs leading-5 text-[#526d95]">
            링크, 카카오톡 문구, 전단 이미지를 한 번에 준비합니다. 연락처와 상세 주소는 공개 문구에서 제외합니다.
          </p>
          <p className="mt-2 text-[11px] font-medium text-[#6a83a9]">
            제공: 링크 복사 · 카카오톡 문구 · 인스타/전단 이미지
          </p>
        </div>
        <button
          type="button"
          onClick={loadSharePanel}
          aria-label="분실/목격 공유 도구 열기"
          className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-[#3567b5] px-3 text-xs font-semibold text-[#fbfdff] transition hover:bg-[#2f5da4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1 sm:w-auto"
        >
          {isLoading ? "공유 도구 준비 중..." : "공유 문구 열기"}
        </button>
      </div>
    </section>
  );
}
