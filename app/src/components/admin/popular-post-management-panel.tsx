"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { unpromotePopularPostAction } from "@/server/actions/policy";

export type PopularPostManagementItem = {
  id: string;
  title: string;
  typeLabel: string;
  authorLabel: string;
  promotedAtLabel: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
};

type PopularPostManagementPanelProps = {
  posts: PopularPostManagementItem[];
};

export function PopularPostManagementPanel({
  posts,
}: PopularPostManagementPanelProps) {
  const [items, setItems] = useState(posts);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingPostId, setPendingPostId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleUnpromote = (postId: string) => {
    setMessage(null);
    setError(null);
    setPendingPostId(postId);

    startTransition(async () => {
      const result = await unpromotePopularPostAction({ postId });
      setPendingPostId(null);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setItems((currentItems) => currentItems.filter((item) => item.id !== postId));
      setMessage(
        result.changed
          ? `"${result.title}" 글을 인기글에서 해제했습니다.`
          : `"${result.title}" 글은 이미 인기글 상태가 아닙니다.`,
      );
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#5a7398]">
        <span>현재 인기글 {items.length.toLocaleString()}개</span>
        <span aria-hidden="true">·</span>
        <span>해제해도 글 자체와 좋아요 수는 유지됩니다.</span>
      </div>

      {message ? (
        <p className="text-xs text-emerald-700" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-rose-600" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}

      {items.length > 0 ? (
        <div className="divide-y divide-[#e5eef9] border-y border-[#e5eef9]">
          {items.map((post) => {
            const isItemPending = isPending && pendingPostId === post.id;

            return (
              <article
                key={post.id}
                className="grid gap-3 py-3 text-xs text-[#4f678d] md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#426792]">
                      {post.typeLabel}
                    </span>
                    <span className="text-[11px] text-[#7a8ca8]">
                      승격 {post.promotedAtLabel}
                    </span>
                  </div>
                  <Link
                    href={`/posts/${post.id}`}
                    className="mt-1 block truncate text-sm font-semibold text-[#173963] hover:underline"
                  >
                    {post.title}
                  </Link>
                  <p className="mt-1 truncate text-[11px] text-[#6b7f9d]">
                    {post.authorLabel} · 좋아요 {post.likeCount.toLocaleString()} · 댓글{" "}
                    {post.commentCount.toLocaleString()} · 조회{" "}
                    {post.viewCount.toLocaleString()}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleUnpromote(post.id)}
                  className="justify-self-start text-xs font-semibold text-rose-700 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50 md:justify-self-end"
                >
                  {isItemPending ? "해제 중" : "인기글 해제"}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="border-y border-[#e5eef9] py-4 text-xs text-[#5a7398]">
          현재 수동 관리할 인기글이 없습니다.
        </p>
      )}
    </div>
  );
}
