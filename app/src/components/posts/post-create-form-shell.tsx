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

const postCreateFooterTextActionClassName =
  "tp-text-muted inline-flex min-h-10 w-full items-center justify-center px-1.5 text-xs font-semibold transition hover:text-[#2f5da4] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1 sm:w-auto";

const postCreateFooterPrimaryActionClassName =
  "inline-flex min-h-10 w-full items-center justify-center rounded-md bg-[#3567b5] px-3 text-xs font-semibold text-[#fbfdff] transition hover:bg-[#2f5da4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-[#9fb2cf] sm:w-auto";

export function PostCreatePolicyAside({
  draftMessage,
  draftSavedAt,
  policySummary,
}: PostCreatePolicyAsideProps) {
  return (
    <aside className="tp-card h-fit p-3 sm:p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5b78a1]">작성 기준</p>
      <div className="mt-2.5 space-y-2.5 text-xs leading-5 text-[#4f678d]">
        <p>{policySummary}</p>
        <div className="border-t border-[#e3ecf8] pt-2">
          <p className="font-semibold text-[#163462]">등록 전 확인</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>동물, 지역, 상황을 제목과 본문에 구체적으로 적어 주세요.</li>
            <li>연락처, 외부 거래 유도는 정책에 따라 제한될 수 있습니다.</li>
            <li>분류를 바꾸면 필요한 추가 정보가 아래에 표시됩니다.</li>
          </ul>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md border border-[#cbdcf5] bg-white px-2 py-0.5 text-[11px] text-[#355988]">
            {draftSavedAt
              ? `임시저장 ${new Date(draftSavedAt).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "임시저장 대기"}
          </span>
          {draftMessage ? (
            <span className="rounded-md border border-[#cbdcf5] bg-white px-2 py-0.5 text-[11px] text-[#315b9a]">
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
      <p className="tp-form-note hidden min-w-0 flex-1 sm:block">{policySummary}</p>
      <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
        {isAuthenticated && !canUseLocalScope ? (
          <Link
            href="/profile"
            className={postCreateFooterTextActionClassName}
          >
            프로필에서 동네 설정
          </Link>
        ) : null}
        <Link
          href="/feed"
          className={postCreateFooterTextActionClassName}
        >
          취소
        </Link>
        <button
          type="submit"
          className={postCreateFooterPrimaryActionClassName}
          disabled={isPending || !isFormInteractive}
        >
          {isPending ? "등록 중..." : "등록"}
        </button>
      </div>
    </div>
  );
}
