"use client";

import { useCallback, useEffect, useState } from "react";

type PublicProfileSummaryStatsProps = {
  userId: string;
  initialSummary: {
    showPublicPosts: boolean;
    showPublicComments: boolean;
    postCount: number | null;
    commentCount: number | null;
    reactionCount: number;
  };
};

type PublicProfileSummaryResponse =
  | {
      ok: true;
      data: PublicProfileSummaryStatsProps["initialSummary"] & {
        id: string;
      };
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };

const SUMMARY_REFRESH_MS = 60_000;

export function PublicProfileSummaryStats({
  userId,
  initialSummary,
}: PublicProfileSummaryStatsProps) {
  const [summary, setSummary] = useState(initialSummary);

  const reloadSummary = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`/api/users/${userId}/profile-summary`, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      signal,
    });

    const payload = (await response.json()) as PublicProfileSummaryResponse;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.ok ? "프로필 요약을 불러오지 못했습니다." : payload.error.message);
    }

    setSummary({
      showPublicPosts: payload.data.showPublicPosts,
      showPublicComments: payload.data.showPublicComments,
      postCount: payload.data.postCount,
      commentCount: payload.data.commentCount,
      reactionCount: payload.data.reactionCount,
    });
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();

    const safeReload = () => {
      void reloadSummary(controller.signal).catch((error) => {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }
      });
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        safeReload();
      }
    };

    const intervalId = window.setInterval(safeReload, SUMMARY_REFRESH_MS);
    window.addEventListener("focus", safeReload);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", safeReload);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [reloadSummary]);

  return (
    <section className="grid gap-3 md:grid-cols-3">
      <div className="tp-card p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">게시글</p>
        {summary.showPublicPosts ? (
          <p className="mt-2 text-3xl font-bold text-[#10284a]">{summary.postCount ?? 0}</p>
        ) : (
          <p className="mt-3 text-sm font-semibold text-[#5a7398]">비공개</p>
        )}
      </div>
      <div className="tp-card p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">댓글</p>
        {summary.showPublicComments ? (
          <p className="mt-2 text-3xl font-bold text-[#10284a]">{summary.commentCount ?? 0}</p>
        ) : (
          <p className="mt-3 text-sm font-semibold text-[#5a7398]">비공개</p>
        )}
      </div>
      <div className="tp-card p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">반응</p>
        <p className="mt-2 text-3xl font-bold text-[#10284a]">{summary.reactionCount}</p>
      </div>
    </section>
  );
}
