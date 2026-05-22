"use client";

import Link from "next/link";

import { COMMENT_CONTENT_MAX_LENGTH } from "@/lib/input-limits";
import {
  POST_COMMENT_FORM_FIELD_CLASS_NAME,
  POST_COMMENT_FORM_MUTED_CLASS_NAME,
  POST_COMMENT_FORM_PANEL_CLASS_NAME,
} from "@/components/posts/post-comment-layout-class";
import { handleCommentSubmitShortcut } from "@/components/posts/post-comment-thread-presenter";

type PostCommentRootFormProps = {
  canComment: boolean;
  lostFoundSightingEnabled?: boolean;
  commentMode?: "GENERAL" | "LOST_FOUND_SIGHTING";
  currentUserId?: string;
  guestDisplayName: string;
  guestPassword: string;
  rootContent: string;
  sightingLocation?: string;
  sightingSeenAt?: string;
  sightingImageUrl?: string;
  isPrivateSighting?: boolean;
  isPending: boolean;
  loginHref: string;
  interactionDisabledMessage?: string;
  onCommentModeChange?: (value: "GENERAL" | "LOST_FOUND_SIGHTING") => void;
  onGuestDisplayNameChange: (value: string) => void;
  onGuestPasswordChange: (value: string) => void;
  onRootContentChange: (value: string) => void;
  onSightingLocationChange?: (value: string) => void;
  onSightingSeenAtChange?: (value: string) => void;
  onSightingImageUrlChange?: (value: string) => void;
  onPrivateSightingChange?: (value: boolean) => void;
  onSubmit: () => void;
};

export function PostCommentRootForm({
  canComment,
  lostFoundSightingEnabled = false,
  commentMode = "GENERAL",
  currentUserId,
  guestDisplayName,
  guestPassword,
  rootContent,
  sightingLocation = "",
  sightingSeenAt = "",
  sightingImageUrl = "",
  isPrivateSighting = false,
  isPending,
  loginHref,
  interactionDisabledMessage,
  onCommentModeChange,
  onGuestDisplayNameChange,
  onGuestPasswordChange,
  onRootContentChange,
  onSightingLocationChange,
  onSightingSeenAtChange,
  onSightingImageUrlChange,
  onPrivateSightingChange,
  onSubmit,
}: PostCommentRootFormProps) {
  return (
    <div className={`${POST_COMMENT_FORM_PANEL_CLASS_NAME} p-2.5 sm:p-2.5`}>
      {canComment ? (
        <>
          {lostFoundSightingEnabled ? (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className={`inline-flex min-h-9 items-center rounded-md border px-3 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2 ${
                  commentMode === "LOST_FOUND_SIGHTING"
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#cbdcf5] bg-white text-[#2f5da4] hover:bg-[#f6faff]"
                }`}
                onClick={() => onCommentModeChange?.("LOST_FOUND_SIGHTING")}
              >
                목격했어요
              </button>
              <button
                type="button"
                className={`inline-flex min-h-9 items-center rounded-md border px-3 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2 ${
                  commentMode === "GENERAL"
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#cbdcf5] bg-white text-[#2f5da4] hover:bg-[#f6faff]"
                }`}
                onClick={() => onCommentModeChange?.("GENERAL")}
              >
                일반 댓글
              </button>
            </div>
          ) : null}
          {!currentUserId ? (
            <div className="mb-1.5 grid gap-1.5 sm:grid-cols-2">
              <input
                data-testid="post-comment-guest-name"
                className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} min-h-11 w-full px-3 py-2 text-[14px] sm:min-h-10 sm:px-2.5 sm:py-1.5 sm:text-[13px]`}
                value={guestDisplayName}
                onChange={(event) => onGuestDisplayNameChange(event.target.value)}
                placeholder="비회원 닉네임"
                maxLength={24}
              />
              <input
                data-testid="post-comment-guest-password"
                className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} min-h-11 w-full px-3 py-2 text-[14px] sm:min-h-10 sm:px-2.5 sm:py-1.5 sm:text-[13px]`}
                type="password"
                value={guestPassword}
                onChange={(event) => onGuestPasswordChange(event.target.value)}
                placeholder="댓글 비밀번호"
                maxLength={32}
              />
            </div>
          ) : null}
          {lostFoundSightingEnabled && commentMode === "LOST_FOUND_SIGHTING" ? (
            <div className="mb-1.5 grid gap-1.5 sm:grid-cols-2">
              <input
                data-testid="lost-found-sighting-location"
                className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} min-h-11 w-full px-3 py-2 text-[14px] sm:min-h-10 sm:px-2.5 sm:py-1.5 sm:text-[13px]`}
                value={sightingLocation}
                onChange={(event) => onSightingLocationChange?.(event.target.value)}
                placeholder="목격 위치(공개 시 상세주소 제외)"
                maxLength={160}
              />
              <input
                data-testid="lost-found-sighting-seen-at"
                className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} min-h-11 w-full px-3 py-2 text-[14px] sm:min-h-10 sm:px-2.5 sm:py-1.5 sm:text-[13px]`}
                type="datetime-local"
                value={sightingSeenAt}
                onChange={(event) => onSightingSeenAtChange?.(event.target.value)}
              />
              <input
                data-testid="lost-found-sighting-image-url"
                className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} min-h-11 w-full px-3 py-2 text-[14px] sm:col-span-2 sm:min-h-10 sm:px-2.5 sm:py-1.5 sm:text-[13px]`}
                value={sightingImageUrl}
                onChange={(event) => onSightingImageUrlChange?.(event.target.value)}
                placeholder="사진 URL 선택 입력"
                maxLength={500}
              />
              <label className="tp-text-subtle flex min-h-10 items-center gap-2 text-[12px] sm:col-span-2">
                <input
                  type="checkbox"
                  checked={isPrivateSighting}
                  onChange={(event) => onPrivateSightingChange?.(event.target.checked)}
                  className="h-4 w-4 rounded border-[#cbdcf5] text-[#3567b5] focus:ring-[#bfd3f0]"
                />
                위치/사진은 보호자에게만 공개
              </label>
              {!isPrivateSighting ? (
                <p className="tp-text-subtle -mt-0.5 text-[11px] leading-4 sm:col-span-2">
                  공개 제보에는 전화번호, 오픈채팅, 이메일, 도로명·번지 주소를 적지 마세요.
                </p>
              ) : null}
            </div>
          ) : null}
          <textarea
            data-testid="post-comment-root-input"
            className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} min-h-24 w-full px-3 py-2 text-[14px] sm:min-h-[72px] sm:px-2.5 sm:py-1.5 sm:text-[13px]`}
            value={rootContent}
            onChange={(event) => onRootContentChange(event.target.value)}
            maxLength={COMMENT_CONTENT_MAX_LENGTH}
            onKeyDown={(event) => handleCommentSubmitShortcut(event, onSubmit)}
            placeholder={
              lostFoundSightingEnabled && commentMode === "LOST_FOUND_SIGHTING"
                ? "동물 상태, 이동 방향, 확인한 단서를 적어 주세요"
                : "댓글을 입력해 주세요"
            }
          />
          <div className="mt-1 flex justify-end">
            <button
              data-testid="post-comment-root-submit"
              type="button"
              className="tp-btn-primary inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold"
              onClick={onSubmit}
              disabled={isPending}
            >
              {isPending
                ? "등록 중..."
                : lostFoundSightingEnabled && commentMode === "LOST_FOUND_SIGHTING"
                  ? "제보 등록"
                  : "댓글 등록"}
            </button>
          </div>
        </>
      ) : (
        <div className={`${POST_COMMENT_FORM_MUTED_CLASS_NAME} tp-text-accent px-3 py-2 text-[13px]`}>
          <div data-testid="post-comment-login-prompt">
            {interactionDisabledMessage ? (
              interactionDisabledMessage
            ) : (
              <>
                댓글 작성/답글/신고는 로그인 후 이용할 수 있습니다.{" "}
                <Link
                  href={loginHref}
                  className="tp-text-link inline-flex min-h-10 items-center font-semibold underline underline-offset-2"
                >
                  로그인하기
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
