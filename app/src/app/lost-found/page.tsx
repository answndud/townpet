import Link from "next/link";

import { createPublicPageMetadata } from "@/lib/page-metadata";
import { formatKoreanDateTime } from "@/lib/date-format";
import { getLostFoundAlertTypeLabel } from "@/lib/lost-found-share";
import {
  getPublicLostFoundLandingPayload,
  type PublicLostFoundLandingPost,
} from "@/server/queries/lost-found.queries";

export const revalidate = 300;

export const metadata = createPublicPageMetadata({
  title: "분실/목격 제보",
  description:
    "분실동물과 목격 제보를 위치, 시간, 특징 중심으로 정리하고 안전하게 공유하는 TownPet 공개 제보 페이지입니다.",
  path: "/lost-found",
});

const primaryActionClassName =
  "tp-btn-primary tp-btn-md inline-flex min-h-11 items-center justify-center px-5";
const secondaryActionClassName =
  "tp-btn-soft tp-btn-md inline-flex min-h-11 items-center justify-center px-5";

function LostFoundStatusCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="border-y border-[#dbe6f5] py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5a7397]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-[#10284a]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[#5a7397]">{description}</p>
    </div>
  );
}

function LostFoundRecentPostCard({ post }: { post: PublicLostFoundLandingPost }) {
  const alertLabel = getLostFoundAlertTypeLabel(post.alert.alertType);
  const featureText = [post.alert.petType, post.alert.breed]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={post.href}
      prefetch={false}
      className="group grid gap-2 border-b border-[#e4edf8] px-3 py-3 transition last:border-b-0 hover:bg-[#f8fbff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#3567b5]"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[#5a7397]">
        <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">
          {alertLabel}
        </span>
        <span className="truncate">{featureText || "반려동물"}</span>
        <span className="text-[#7b8faa]">{formatKoreanDateTime(post.alert.lastSeenAt)}</span>
      </div>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold leading-5 text-[#173963] group-hover:text-[#214d8d]">
          {post.title}
        </h2>
        <p className="mt-1 truncate text-xs leading-5 text-[#5a7397]">
          마지막 확인 위치: {post.alert.lastSeenLocation}
        </p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-4 text-[#6b84a8]">
        <span className="font-semibold text-[#48648d]">{post.authorName}</span>
        <span>댓글 {post.commentCount}</span>
        <span>조회 {post.viewCount}</span>
        <span>좋아요 {post.likeCount}</span>
      </div>
    </Link>
  );
}

export default async function LostFoundLandingPage() {
  const payload = await getPublicLostFoundLandingPayload({ limit: 6 });

  return (
    <main className="tp-page-bg min-h-screen">
      <section className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 sm:py-12 lg:px-10">
        <div className="max-w-[780px]">
          <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.16em] text-[#486894] sm:tracking-[0.22em]">
            분실/목격 제보
          </p>
          <h1 className="mt-3 text-[2rem] font-semibold leading-[1.13] text-[#10284a] break-keep sm:mt-4 sm:text-5xl">
            우리 동네 분실동물 제보를 빠르게 정리하고 공유하세요
          </h1>
          <p className="mt-3 max-w-[700px] text-[15px] leading-7 text-[#4f6f99] break-keep sm:mt-5 sm:text-lg">
            동물 종류, 마지막 확인 시간, 공개 가능한 위치, 특징을 같은 형식으로 남기면
            주변 사람이 더 빨리 확인하고 댓글로 목격 정보를 남길 수 있습니다.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:mt-7 sm:flex-row sm:flex-wrap">
            <Link
              href="/posts/new?type=LOST_FOUND&template=lost_pet"
              className={primaryActionClassName}
            >
              분실/목격 등록
            </Link>
            <Link href="/feed/guest?type=LOST_FOUND" className={secondaryActionClassName}>
              전체 제보
            </Link>
            <Link href="/guides/lost-pet-first-24-hours" className={secondaryActionClassName}>
              첫 24시간 가이드
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1180px] gap-5 px-4 pb-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-10">
        <div className="min-w-0">
          <div className="border-b border-[#dbe6f5] pb-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#486894]">
              공개 제보
            </p>
            <h2 className="mt-1.5 text-lg font-semibold text-[#173963] sm:text-xl">
              최근 공개 제보
            </h2>
          </div>
          <div className="mt-3 border-y border-[#dbe6f5] bg-[#fbfdff]">
            {payload.recentPosts.length > 0 ? (
              payload.recentPosts.map((post) => (
                <LostFoundRecentPostCard key={post.id} post={post} />
              ))
            ) : (
              <div className="grid gap-2 px-3 py-5">
                <p className="text-sm font-semibold text-[#173963]">
                  최근 공개된 분실/목격 제보가 없습니다.
                </p>
                <p className="text-xs leading-5 text-[#5a7397]">
                  제보가 필요한 상황이라면 먼저 위치와 시간을 정리한 뒤 공개 가능한 범위만 남겨 주세요.
                </p>
                <Link
                  href="/posts/new?type=LOST_FOUND&template=lost_pet"
                  className="text-xs font-semibold text-[#315b9a] hover:underline hover:underline-offset-4"
                >
                  첫 제보 등록
                </Link>
              </div>
            )}
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <LostFoundStatusCard
            label="진행 중"
            value={`${payload.activeCount}건`}
            description="현재 공개 상태인 분실/목격 제보입니다. 종료된 글은 상세 상태에 따라 별도로 관리됩니다."
          />

          <section className="border-y border-[#dbe6f5] py-3">
            <h2 className="text-sm font-semibold text-[#173963]">공개 전 확인</h2>
            <ul className="mt-2 grid gap-2 text-xs leading-5 text-[#5a7397]">
              <li>전화번호, 오픈채팅, 이메일은 공개 본문에 적지 않습니다.</li>
              <li>도로명·번지 주소 대신 동네, 공원, 역, 상가명처럼 범위를 줄입니다.</li>
              <li>목격자는 위치, 시간, 이동 방향을 댓글의 목격 제보로 남깁니다.</li>
              <li>구조나 포획은 현장 안전과 공공기관 안내를 우선합니다.</li>
            </ul>
          </section>

          <section className="border-y border-[#dbe6f5] py-3">
            <h2 className="text-sm font-semibold text-[#173963]">공유 도구</h2>
            <p className="mt-1 text-xs leading-5 text-[#5a7397]">
              분실/목격 글 상세에는 링크 복사, 카카오톡 문구, 인스타/전단 이미지 진입이 제공됩니다.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/guides/lost-dog-poster"
                className="text-xs font-semibold text-[#315b9a] hover:underline hover:underline-offset-4"
              >
                전단 작성 기준
              </Link>
              <Link
                href="/feed/guest?type=LOST_FOUND"
                className="text-xs font-semibold text-[#315b9a] hover:underline hover:underline-offset-4"
              >
                제보 목록
              </Link>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
