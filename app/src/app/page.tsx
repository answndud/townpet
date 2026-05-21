import type { Metadata } from "next";
import Link from "next/link";

import { HomeFeedPreview } from "@/components/home/home-feed-preview";
import { LAUNCH_REGION } from "@/lib/launch-region";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "우리 동네 반려생활 정보",
  description:
    "동물병원, 산책코스, 분실동물, 입양, 중고거래 정보를 지역별로 찾고 공유하는 동네 반려생활 정보 커뮤니티입니다.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TownPet | 우리 동네 반려생활 정보",
    description:
      "동물병원, 산책코스, 분실동물, 입양, 중고거래 정보를 지역별로 찾고 공유하는 동네 반려생활 정보 커뮤니티입니다.",
    url: "/",
  },
};

const QUICK_ACTIONS = [
  {
    label: "분실동물 등록",
    href: "/posts/new?type=LOST_FOUND",
    description: "실종 위치와 특징을 구조화해 바로 공유합니다.",
  },
  ...LAUNCH_REGION.priorityLinks.slice(1),
];

const TOPIC_LINKS = [
  ...LAUNCH_REGION.priorityLinks.map((link) => ({
    label: link.label,
    href: link.href,
  })),
  { label: "질문/답변", href: "/feed/guest?type=QA_QUESTION" },
  { label: "중고거래", href: "/feed/guest?type=MARKET_LISTING" },
];

export default function HomePage() {
  return (
    <main className="tp-page-bg min-h-screen">
      <section className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-10">
        <div className="flex min-w-0 flex-col justify-center">
          <p className="tp-eyebrow">동네 반려생활 정보 지도</p>
          <h1 className="mt-4 max-w-[760px] text-4xl font-semibold leading-[1.08] text-[#10284a] break-keep sm:text-5xl">
            우리 동네 반려생활 정보, TownPet
          </h1>
          <p className="mt-5 max-w-[680px] text-base leading-7 text-[#4f6f99] break-keep sm:text-lg">
            동물병원, 산책코스, 분실동물, 입양, 중고거래 정보를 지역별로 찾고 공유하는
            동네 반려생활 정보 커뮤니티입니다.
          </p>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href={LAUNCH_REGION.selectionHref}
              className="tp-btn-primary tp-btn-md inline-flex min-h-11 items-center justify-center px-5"
            >
              내 동네 정보 보기
            </Link>
            <Link
              href="/posts/new?type=LOST_FOUND"
              className="tp-btn-soft tp-btn-md inline-flex min-h-11 items-center justify-center px-5"
            >
              분실동물 등록하기
            </Link>
            <Link
              href={LAUNCH_REGION.priorityLinks[1]?.href ?? "/feed/guest"}
              className="tp-btn-soft tp-btn-md inline-flex min-h-11 items-center justify-center px-5"
            >
              병원/산책 정보 보기
            </Link>
          </div>
        </div>

        <div className="grid content-start gap-3">
          <div className="tp-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4e6f9f]">
              첫 시작 지역
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#173963]">
              {LAUNCH_REGION.headline}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5a7397]">{LAUNCH_REGION.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-md border border-[#cbdcf5] bg-[#f7fbff] px-2.5 py-1 text-xs font-semibold text-[#315b9a]">
                {LAUNCH_REGION.label}
              </span>
              <span className="rounded-md border border-[#dbe6f5] bg-[#fbfdff] px-2.5 py-1 text-xs text-[#5a7397]">
                기준 동네 {LAUNCH_REGION.neighborhood}
              </span>
            </div>
            <Link
              href={LAUNCH_REGION.campaignHref}
              className="tp-btn-soft mt-4 inline-flex min-h-10 items-center px-3 text-xs"
            >
              {LAUNCH_REGION.district} 분실/목격 제보 보기
            </Link>
          </div>
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="tp-card block p-4 transition hover:border-[#aac5ec] hover:shadow-[0_12px_28px_rgba(30,63,116,0.08)]"
            >
              <p className="text-sm font-semibold text-[#173963]">{action.label}</p>
              <p className="mt-1 text-xs leading-5 text-[#5a7397]">{action.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-4 pb-10 sm:px-6 lg:px-10">
        <div className="tp-soft-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#173963]">
              {LAUNCH_REGION.district} 반려생활 지도 만들기
            </p>
            <p className="mt-1 text-sm leading-6 text-[#5a7397]">
              {LAUNCH_REGION.district} 지역 정보를 병원, 산책, 분실/목격 제보 중심으로
              모으고 있습니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {LAUNCH_REGION.candidates.map((candidate) => (
                <span
                  key={candidate.slug}
                  className="rounded-md border border-[#dbe6f5] bg-[#fbfdff] px-2.5 py-1 text-xs text-[#5a7397]"
                  title={candidate.reason}
                >
                  다음 후보: {candidate.label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {TOPIC_LINKS.map((topic) => (
              <Link key={topic.href} href={topic.href} className="tp-filter-pill">
                {topic.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <HomeFeedPreview />
    </main>
  );
}
