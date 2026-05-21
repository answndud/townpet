"use client";

import Link from "next/link";

import { PostEditorToolbarButton } from "@/components/posts/post-rich-text-editor-shell";

type DraftStatusProps = {
  draftMessage: string | null;
  draftSavedAt: number | string | null;
};

type PostCreatePolicyAsideProps = DraftStatusProps & {
  policySummary: string;
};

type PostCreateEditorFooterProps = DraftStatusProps & {
  onClearDraft: () => void;
};

type PostCreateSubmitFooterProps = {
  canUseLocalScope: boolean;
  isAuthenticated: boolean;
  isFormInteractive: boolean;
  isPending: boolean;
  policySummary: string;
};

export function PostCreatePolicyAside({
  draftMessage,
  draftSavedAt,
  policySummary,
}: PostCreatePolicyAsideProps) {
  return (
    <aside className="tp-card h-fit p-4 sm:p-5">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">작성 기준</p>
      <div className="mt-3 space-y-3 text-xs leading-6 text-[#4f678d]">
        <p>{policySummary}</p>
        <div className="rounded-lg border border-[#d8e4f6] bg-[#f8fbff] p-3">
          <p className="font-semibold text-[#163462]">등록 전 확인</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>제목과 본문에 동물, 지역, 상황을 구체적으로 적어 주세요.</li>
            <li>연락처나 외부 거래 유도는 정책에 따라 제한될 수 있습니다.</li>
            <li>임시저장은 이 브라우저에만 24시간 보관되며 공용 기기에서는 삭제해 주세요.</li>
            <li>분류를 바꾸면 필요한 추가 정보가 아래에 표시됩니다.</li>
          </ul>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-[#cbdcf5] bg-white px-2.5 py-1 text-[#355988]">
            {draftSavedAt
              ? `임시저장 ${new Date(draftSavedAt).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "임시저장 대기"}
          </span>
          {draftMessage ? (
            <span className="rounded-lg border border-[#cbdcf5] bg-white px-2.5 py-1 text-[#315b9a]">
              {draftMessage}
            </span>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export function PostCreateEditorFooter({
  draftMessage,
  draftSavedAt,
  onClearDraft,
}: PostCreateEditorFooterProps) {
  return (
    <>
      <PostEditorToolbarButton onClick={onClearDraft}>임시저장 삭제</PostEditorToolbarButton>
      <span className="tp-text-subtle">
        {draftSavedAt
          ? `임시저장: ${new Date(draftSavedAt).toLocaleString("ko-KR")}`
          : "임시저장 없음"}
      </span>
      {draftMessage ? <span className="tp-text-accent">{draftMessage}</span> : null}
    </>
  );
}

export function PostCreateSubmitFooter({
  canUseLocalScope,
  isAuthenticated,
  isFormInteractive,
  isPending,
  policySummary,
}: PostCreateSubmitFooterProps) {
  return (
    <div className="tp-border-soft flex flex-wrap items-center justify-between gap-2 border-t pt-2">
      <p className="tp-form-note">{policySummary}</p>
      <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
        {isAuthenticated && !canUseLocalScope ? (
          <Link
            href="/profile"
            className="tp-btn-soft inline-flex h-[30px] w-full items-center justify-center px-3 text-[11px] font-semibold leading-none sm:w-auto"
          >
            프로필에서 동네 설정
          </Link>
        ) : null}
        <Link
          href="/feed"
          className="tp-btn-soft inline-flex h-[30px] w-full items-center justify-center px-3 text-[11px] font-semibold leading-none sm:w-auto"
        >
          취소
        </Link>
        <button
          type="submit"
          className="tp-btn-primary inline-flex h-[30px] w-full items-center justify-center px-4 text-[11px] font-semibold leading-none disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0] sm:w-auto"
          disabled={isPending || !isFormInteractive}
        >
          {isPending ? "등록 중..." : "등록"}
        </button>
      </div>
    </div>
  );
}
