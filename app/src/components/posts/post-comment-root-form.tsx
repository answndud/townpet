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
  currentUserId?: string;
  guestDisplayName: string;
  guestPassword: string;
  rootContent: string;
  isPending: boolean;
  loginHref: string;
  interactionDisabledMessage?: string;
  onGuestDisplayNameChange: (value: string) => void;
  onGuestPasswordChange: (value: string) => void;
  onRootContentChange: (value: string) => void;
  onSubmit: () => void;
};

export function PostCommentRootForm({
  canComment,
  currentUserId,
  guestDisplayName,
  guestPassword,
  rootContent,
  isPending,
  loginHref,
  interactionDisabledMessage,
  onGuestDisplayNameChange,
  onGuestPasswordChange,
  onRootContentChange,
  onSubmit,
}: PostCommentRootFormProps) {
  return (
    <div className={`${POST_COMMENT_FORM_PANEL_CLASS_NAME} p-2.5 sm:p-2.5`}>
      {canComment ? (
        <>
          {!currentUserId ? (
            <div className="mb-1.5 grid gap-1.5 sm:grid-cols-2">
              <input
                data-testid="post-comment-guest-name"
                className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} min-h-11 w-full px-3 py-2 text-[14px] sm:min-h-9 sm:px-2.5 sm:py-1.5 sm:text-[13px]`}
                value={guestDisplayName}
                onChange={(event) => onGuestDisplayNameChange(event.target.value)}
                placeholder="비회원 닉네임"
                maxLength={24}
              />
              <input
                data-testid="post-comment-guest-password"
                className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} min-h-11 w-full px-3 py-2 text-[14px] sm:min-h-9 sm:px-2.5 sm:py-1.5 sm:text-[13px]`}
                type="password"
                value={guestPassword}
                onChange={(event) => onGuestPasswordChange(event.target.value)}
                placeholder="댓글 비밀번호"
                maxLength={32}
              />
            </div>
          ) : null}
          <textarea
            data-testid="post-comment-root-input"
            className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} min-h-24 w-full px-3 py-2 text-[14px] sm:min-h-[72px] sm:px-2.5 sm:py-1.5 sm:text-[13px]`}
            value={rootContent}
            onChange={(event) => onRootContentChange(event.target.value)}
            maxLength={COMMENT_CONTENT_MAX_LENGTH}
            onKeyDown={(event) => handleCommentSubmitShortcut(event, onSubmit)}
            placeholder="댓글을 입력해 주세요"
          />
          <div className="mt-1 flex justify-end">
            <button
              data-testid="post-comment-root-submit"
              type="button"
              className="tp-btn-primary tp-btn-sm"
              onClick={onSubmit}
              disabled={isPending}
            >
              댓글 등록
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
                  className="tp-text-link font-semibold underline underline-offset-2"
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
