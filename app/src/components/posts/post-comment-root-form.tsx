"use client";

import Link from "next/link";

import { COMMENT_CONTENT_MAX_LENGTH } from "@/lib/input-limits";
import {
  COMMENT_LOGIN_REQUIRED_MESSAGE,
  GUEST_COMMENT_GUIDE_BODY,
  GUEST_COMMENT_GUIDE_TITLE,
  MEMBER_COMMENT_GUIDE_BODY,
  MEMBER_COMMENT_GUIDE_TITLE,
} from "@/lib/interaction-auth-copy";
import {
  POST_COMMENT_FORM_MUTED_CLASS_NAME,
  POST_COMMENT_ROOT_FORM_ACTION_ROW_CLASS_NAME,
  POST_COMMENT_ROOT_FORM_INPUT_CLASS_NAME,
  POST_COMMENT_ROOT_FORM_MODE_BUTTON_BASE_CLASS_NAME,
  POST_COMMENT_ROOT_FORM_MODE_ROW_CLASS_NAME,
  POST_COMMENT_ROOT_FORM_ROW_CLASS_NAME,
  POST_COMMENT_ROOT_FORM_SHELL_CLASS_NAME,
  POST_COMMENT_ROOT_FORM_SUBMIT_CLASS_NAME,
  POST_COMMENT_ROOT_FORM_TEXTAREA_CLASS_NAME,
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
    <div className={POST_COMMENT_ROOT_FORM_SHELL_CLASS_NAME}>
      {canComment ? (
        <>
          {!currentUserId ? (
            <div className="mb-1.5 rounded-md bg-[#f8fbff] px-2.5 py-2 text-[12px] leading-5 text-[#4f678d]">
              <p className="font-semibold text-[#173963]">{GUEST_COMMENT_GUIDE_TITLE}</p>
              <p>{GUEST_COMMENT_GUIDE_BODY}</p>
            </div>
          ) : (
            <div className="mb-1.5 rounded-md bg-[#f8fbff] px-2.5 py-2 text-[12px] leading-5 text-[#4f678d]">
              <p className="font-semibold text-[#173963]">{MEMBER_COMMENT_GUIDE_TITLE}</p>
              <p>{MEMBER_COMMENT_GUIDE_BODY}</p>
            </div>
          )}
          {lostFoundSightingEnabled ? (
            <div className={POST_COMMENT_ROOT_FORM_MODE_ROW_CLASS_NAME}>
              <button
                type="button"
                className={`${POST_COMMENT_ROOT_FORM_MODE_BUTTON_BASE_CLASS_NAME} ${
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
                className={`${POST_COMMENT_ROOT_FORM_MODE_BUTTON_BASE_CLASS_NAME} ${
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
            <div className={POST_COMMENT_ROOT_FORM_ROW_CLASS_NAME}>
              <label className="sr-only" htmlFor="post-comment-guest-name">
                비회원 닉네임
              </label>
              <input
                id="post-comment-guest-name"
                data-testid="post-comment-guest-name"
                className={POST_COMMENT_ROOT_FORM_INPUT_CLASS_NAME}
                value={guestDisplayName}
                onChange={(event) => onGuestDisplayNameChange(event.target.value)}
                placeholder="비회원 닉네임"
                maxLength={24}
              />
              <label className="sr-only" htmlFor="post-comment-guest-password">
                댓글 비밀번호
              </label>
              <input
                id="post-comment-guest-password"
                data-testid="post-comment-guest-password"
                className={POST_COMMENT_ROOT_FORM_INPUT_CLASS_NAME}
                type="password"
                value={guestPassword}
                onChange={(event) => onGuestPasswordChange(event.target.value)}
                placeholder="댓글 비밀번호"
                maxLength={32}
              />
            </div>
          ) : null}
          {lostFoundSightingEnabled && commentMode === "LOST_FOUND_SIGHTING" ? (
            <div className={POST_COMMENT_ROOT_FORM_ROW_CLASS_NAME}>
              <input
                data-testid="lost-found-sighting-location"
                className={POST_COMMENT_ROOT_FORM_INPUT_CLASS_NAME}
                value={sightingLocation}
                onChange={(event) => onSightingLocationChange?.(event.target.value)}
                placeholder="목격 위치(공개 시 상세주소 제외)"
                maxLength={160}
              />
              <input
                data-testid="lost-found-sighting-seen-at"
                className={POST_COMMENT_ROOT_FORM_INPUT_CLASS_NAME}
                type="datetime-local"
                value={sightingSeenAt}
                onChange={(event) => onSightingSeenAtChange?.(event.target.value)}
              />
              <input
                data-testid="lost-found-sighting-image-url"
                className={`${POST_COMMENT_ROOT_FORM_INPUT_CLASS_NAME} sm:col-span-2`}
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
                <p className="tp-text-subtle -mt-1 text-[11px] leading-4 sm:col-span-2">
                  공개 제보에는 전화번호, 오픈채팅, 이메일, 도로명·번지 주소를 적지 마세요.
                </p>
              ) : null}
            </div>
          ) : null}
          <textarea
            aria-label={
              lostFoundSightingEnabled && commentMode === "LOST_FOUND_SIGHTING"
                ? "목격 제보 내용"
                : "댓글 내용"
            }
            data-testid="post-comment-root-input"
            className={POST_COMMENT_ROOT_FORM_TEXTAREA_CLASS_NAME}
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
          <div className={POST_COMMENT_ROOT_FORM_ACTION_ROW_CLASS_NAME}>
            <button
              data-testid="post-comment-root-submit"
              type="button"
              className={POST_COMMENT_ROOT_FORM_SUBMIT_CLASS_NAME}
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
                {COMMENT_LOGIN_REQUIRED_MESSAGE}{" "}
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
