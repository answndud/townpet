import Link from "next/link";

import { buildOperatorContentMetaLabel } from "@/components/posts/operator-content-source-panel";
import type { HomeFeedItem, HomeFeedPayload } from "@/server/queries/home-feed.queries";

type EmptyAction = {
  href: string;
  label: string;
  note: string;
};

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

export function FeedPreviewList({
  items,
  emptyText,
  emptyActions,
}: {
  items: HomeFeedItem[];
  emptyText: string;
  emptyActions: EmptyAction[];
}) {
  if (items.length === 0) {
    return (
      <div className="border-y border-[#dbe6f5] bg-[#fbfdff]">
        <div className="px-3 py-2">
          <p className="text-xs leading-5 text-[#5a7397]">{emptyText}</p>
        </div>
        <div className="divide-y divide-[#e5edf8] border-t border-[#e5edf8]">
          {emptyActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="grid gap-0.5 px-3 py-2 transition hover:bg-[#f6faff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#3567b5]"
            >
              <span className="text-xs font-semibold leading-5 text-[#315b9a]">
                {action.label}
              </span>
              <span className="text-[11px] leading-4 text-[#6b84a8]">{action.note}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-y border-[#dbe6f5] bg-[#fbfdff]">
      {items.slice(0, 4).map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="group grid gap-0.5 border-b border-[#e5edf8] px-2.5 py-1.5 transition last:border-b-0 hover:bg-[#f6faff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#3567b5] sm:grid-cols-[minmax(0,1fr)_minmax(7.5rem,auto)] sm:items-center"
        >
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-x-1.5 text-[10px] font-semibold leading-4 text-[#5d789f]">
              {item.typeLabel !== "자유게시판" ? (
                <span className="shrink-0 rounded-md border border-[#dbe5f3] bg-[#f7fbff] px-1.5 py-0.5 text-[#315b9a]">
                  {item.typeLabel}
                </span>
              ) : null}
              {item.neighborhoodLabel ? (
                <span className="truncate">{item.neighborhoodLabel}</span>
              ) : null}
              <span className="shrink-0">{formatDate(item.createdAt)}</span>
            </div>
            <h3 className="mt-1 truncate text-sm font-semibold leading-5 text-[#173963] group-hover:text-[#214d8d]">
              {item.title}
            </h3>
            {item.excerpt ? (
              <p className="truncate text-[11px] leading-4 text-[#5a7397] sm:hidden">
                {item.excerpt}
              </p>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 overflow-hidden text-[10px] leading-4 text-[#6b84a8] sm:justify-end sm:text-right">
            <span className="max-w-[8rem] truncate font-semibold text-[#48648d] sm:max-w-[7rem]">
              {item.authorName}
            </span>
            {item.isOperatorContent ? (
              <span className="max-w-[12rem] truncate text-[#48648d]">
                {buildOperatorContentMetaLabel({
                  sourceName: item.operatorSourceName,
                  lastVerifiedAt: item.operatorLastVerifiedAt,
                })}
              </span>
            ) : null}
            <span className="whitespace-nowrap">좋아요 {item.likeCount}</span>
            <span className="whitespace-nowrap">댓글 {item.commentCount}</span>
            <span className="whitespace-nowrap">조회 {item.viewCount}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function HomeFeedPreview({ data }: { data: HomeFeedPayload }) {
  return (
    <section className="mx-auto w-full max-w-[1180px] px-4 pb-10 sm:px-6 sm:pb-12 lg:px-10">
      <div className="border-b border-[#dbe6f5] pb-2.5 sm:pb-3">
        <div>
          <p className="text-[11px] font-semibold leading-none tracking-[0.16em] text-[#486894]">
            실시간 게시판
          </p>
        </div>
        <h2 className="mt-1.5 text-lg font-semibold text-[#173963] sm:text-xl">
          지금 올라온 글
        </h2>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[#173963]">먼저 확인할 글</h3>
            <Link href="/feed/guest?mode=BEST&days=7" className="text-xs font-semibold text-[#315b9a]" aria-label="반응 많은 글">
              더 읽기
            </Link>
          </div>
          <FeedPreviewList
            items={data.featured}
            emptyText="먼저 확인할 공개 글을 준비하고 있습니다."
            emptyActions={[
              {
                href: "/guides/24h-vet-checklist",
                label: "24시 병원 확인 가이드",
                note: "야간 진료 전 전화로 확인할 항목을 정리했습니다.",
              },
              {
                href: "/feed/guest?type=HOSPITAL_REVIEW",
                label: "동물병원 글",
                note: "공개된 병원 경험 글을 최신순으로 확인합니다.",
              },
            ]}
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[#173963]">최근 올라온 글</h3>
            <Link href="/feed/guest?sort=LATEST" className="text-xs font-semibold text-[#315b9a]">
              더 읽기
            </Link>
          </div>
          <FeedPreviewList
            items={data.latest}
            emptyText="최근 올라온 공개 글이 아직 없습니다."
            emptyActions={[
              {
                href: "/guides/lost-pet-first-24-hours",
                label: "분실동물 첫 24시간 가이드",
                note: "찾아야 할 장소와 제보 정리 순서를 먼저 확인합니다.",
              },
              {
                href: "/posts/new",
                label: "첫 글 작성하기",
                note: "병원, 산책, 분실, 중고거래 정보를 직접 남길 수 있습니다.",
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
