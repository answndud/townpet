"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchJson, isAbortError } from "@/lib/client-json";

type HomeFeedItem = {
  id: string;
  href: string;
  title: string;
  excerpt: string;
  typeLabel: string;
  createdAt: string;
  authorName: string;
  neighborhoodLabel: string | null;
  commentCount: number;
  likeCount: number;
  viewCount: number;
};

type HomeFeedPayload = {
  best: HomeFeedItem[];
  latest: HomeFeedItem[];
};

type HomeFeedResponse =
  | { ok: true; data: HomeFeedPayload }
  | { ok: false; error: { message: string } };

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

function FeedPreviewSkeleton() {
  return (
    <div className="border-y border-[#dbe6f5] bg-[#fbfdff]">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={`home-feed-skeleton-${index}`}
          className="animate-pulse border-b border-[#e5edf8] px-3 py-3 last:border-b-0"
          aria-hidden="true"
        >
          <div className="flex items-center gap-2">
            <div className="h-5 w-16 rounded-md bg-[#dce8f8]" />
            <div className="h-3 w-20 rounded bg-[#edf3fb]" />
          </div>
          <div className="mt-2 h-4 w-4/5 rounded bg-[#dce8f8]" />
          <div className="mt-2 h-3 w-2/3 rounded bg-[#edf3fb]" />
        </div>
      ))}
    </div>
  );
}

function FeedPreviewList({ items }: { items: HomeFeedItem[] }) {
  if (items.length === 0) {
    return (
      <div className="border-y border-[#dbe6f5] bg-[#fbfdff] px-3 py-4 text-sm leading-6 text-[#5a7397]">
        아직 표시할 공개 게시글이 없습니다. 첫 지역 정보를 남겨주세요.
      </div>
    );
  }

  return (
    <div className="border-y border-[#dbe6f5] bg-[#fbfdff]">
      {items.slice(0, 4).map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="group grid gap-2 border-b border-[#e5edf8] px-3 py-3 transition last:border-b-0 hover:bg-[#f6faff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#3567b5] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-[#5d789f]">
              <span className="rounded-md border border-[#dbe5f3] bg-[#f7fbff] px-2 py-0.5 text-[#315b9a]">
                {item.typeLabel}
              </span>
              {item.neighborhoodLabel ? <span>{item.neighborhoodLabel}</span> : null}
              <span>{formatDate(item.createdAt)}</span>
            </div>
            <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-[#173963] group-hover:text-[#214d8d]">
              {item.title}
            </h3>
            {item.excerpt ? (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#5a7397]">
                {item.excerpt}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#6b84a8] sm:justify-end">
            <span>{item.authorName}</span>
            <span>좋아요 {item.likeCount}</span>
            <span>댓글 {item.commentCount}</span>
            <span>조회 {item.viewCount}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function HomeFeedPreview() {
  const [data, setData] = useState<HomeFeedPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      try {
        const { response, payload } = await fetchJson<HomeFeedResponse>("/api/home/feed", {
          method: "GET",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (cancelled) {
          return;
        }
        if (!response.ok || !payload.ok) {
          throw new Error(payload.ok ? "홈 피드를 불러오지 못했습니다." : payload.error.message);
        }
        setData(payload.data);
        setError(null);
      } catch (loadError) {
        if (isAbortError(loadError) || cancelled) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "홈 피드를 불러오지 못했습니다.");
      }
    };

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-[1180px] px-4 pb-14 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="tp-eyebrow">Live board</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#173963]">지금 올라온 동네 반려 정보</h2>
        </div>
        <Link href="/feed/guest" className="tp-btn-soft tp-btn-md inline-flex justify-center">
          전체 피드 보기
        </Link>
      </div>

      {error ? (
        <div className="tp-soft-card mt-4 p-4 text-sm leading-6 text-[#5a7397]">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-[#173963]">지금 많이 보는 글</h3>
            <Link href="/feed/guest?mode=BEST&days=7" className="text-xs font-semibold text-[#315b9a]">
              더보기
            </Link>
          </div>
          {data ? <FeedPreviewList items={data.best} /> : <FeedPreviewSkeleton />}
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-[#173963]">최근 올라온 글</h3>
            <Link href="/feed/guest?sort=LATEST" className="text-xs font-semibold text-[#315b9a]">
              더보기
            </Link>
          </div>
          {data ? <FeedPreviewList items={data.latest} /> : <FeedPreviewSkeleton />}
        </div>
      </div>
    </section>
  );
}
