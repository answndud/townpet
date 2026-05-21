import type { Metadata } from "next";

import {
  AcquisitionEventTracker,
  AcquisitionTrackedLink,
} from "@/components/analytics/acquisition-event-tracker";
import { HomeFeedPreview } from "@/components/home/home-feed-preview";
import { NEIGHBORHOOD_MAP_CAMPAIGN_PATH } from "@/lib/campaign-pages";

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

const TOPIC_LINKS = [
  { label: "지도 만들기", href: NEIGHBORHOOD_MAP_CAMPAIGN_PATH },
  { label: "분실/목격", href: "/feed/guest?type=LOST_FOUND" },
  { label: "동물병원", href: "/feed/guest?type=HOSPITAL_REVIEW" },
  { label: "산책코스", href: "/feed/guest?type=WALK_ROUTE" },
  { label: "질문/답변", href: "/feed/guest?type=QA_QUESTION" },
  { label: "중고거래", href: "/feed/guest?type=MARKET_LISTING" },
];

export default function HomePage() {
  return (
    <main className="tp-page-bg min-h-screen">
      <AcquisitionEventTracker
        event={{
          surface: "HOME",
          event: "LANDING_VIEWED",
          targetType: "CTA",
          targetId: "home",
        }}
      />
      <section className="mx-auto w-full max-w-[1180px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
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
            <AcquisitionTrackedLink
              href="/feed/guest"
              className="tp-btn-primary tp-btn-md inline-flex min-h-11 items-center justify-center px-5"
              event={{
                surface: "HOME",
                event: "FEED_CTA_CLICKED",
                targetType: "CTA",
                targetId: "hero_feed",
              }}
            >
              전체 피드 보기
            </AcquisitionTrackedLink>
            <AcquisitionTrackedLink
              href="/onboarding"
              className="tp-btn-soft tp-btn-md inline-flex min-h-11 items-center justify-center px-5"
              event={{
                surface: "HOME",
                event: "ONBOARDING_CTA_CLICKED",
                targetType: "CTA",
                targetId: "hero_onboarding",
              }}
            >
              내 동네 허브 시작하기
            </AcquisitionTrackedLink>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-4 pb-8 sm:px-6 lg:px-10">
        <div className="border-y border-[#dbe6f5] py-3 sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#173963]">관심 주제</p>
            <p className="mt-0.5 text-xs leading-5 text-[#5a7397]">
              분실, 병원, 산책처럼 자주 찾는 정보를 바로 확인하세요.
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-0 sm:justify-end">
            {TOPIC_LINKS.map((topic) => (
              <AcquisitionTrackedLink
                key={topic.href}
                href={topic.href}
                className="tp-filter-pill min-h-[1.875rem] px-2.5 py-1 text-[11px]"
                event={{
                  surface: "HOME",
                  event:
                    topic.href === NEIGHBORHOOD_MAP_CAMPAIGN_PATH
                      ? "CAMPAIGN_CTA_CLICKED"
                      : "FEED_CTA_CLICKED",
                  targetType: "CTA",
                  targetId: topic.label,
                }}
              >
                {topic.label}
              </AcquisitionTrackedLink>
            ))}
          </div>
        </div>
      </section>

      <HomeFeedPreview />
    </main>
  );
}
