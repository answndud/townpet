import type { Metadata } from "next";

import {
  AcquisitionEventTracker,
  AcquisitionTrackedLink,
} from "@/components/analytics/acquisition-event-tracker";
import { HomeFeedPreview } from "@/components/home/home-feed-preview";
import { NEIGHBORHOOD_MAP_CAMPAIGN_PATH } from "@/lib/campaign-pages";
import { getHomeFeedPayload } from "@/server/queries/home-feed.queries";

export const revalidate = 60;

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

export default async function HomePage() {
  const homeFeed = await getHomeFeedPayload();

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
      <section className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 sm:py-14 lg:px-10">
        <div className="flex min-w-0 flex-col justify-center">
          <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.16em] text-[#486894] sm:tracking-[0.22em]">
            동네 반려생활 정보
          </p>
          <h1 className="mt-3 max-w-[760px] text-[2rem] font-semibold leading-[1.13] text-[#10284a] break-keep sm:mt-4 sm:text-5xl">
            우리 동네 반려생활 정보
          </h1>
          <p className="mt-3 max-w-[680px] text-[15px] leading-7 text-[#4f6f99] break-keep sm:mt-5 sm:text-lg">
            동물병원, 산책코스, 분실동물, 입양, 중고거래 정보를 지역별로 찾고 공유하는
            동네 반려생활 정보 커뮤니티입니다.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:mt-7 sm:flex-row sm:flex-wrap">
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
              전체 피드
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
              내 동네 설정
            </AcquisitionTrackedLink>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-4 pb-5 sm:px-6 sm:pb-8 lg:px-10">
        <div className="border-y border-[#dbe6f5] py-2.5 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#173963]">관심 주제</p>
            <p className="mt-0.5 hidden text-xs leading-5 text-[#5a7397] sm:block">
              분실, 병원, 산책처럼 자주 찾는 정보를 바로 확인하세요.
            </p>
          </div>
          <div className="mt-2 flex gap-1.5 overflow-x-auto sm:mt-0 sm:flex-wrap sm:justify-end sm:overflow-visible">
            {TOPIC_LINKS.map((topic) => (
              <AcquisitionTrackedLink
                key={topic.href}
                href={topic.href}
                className="inline-flex min-h-8 shrink-0 items-center rounded-md border border-[#d6e2f1] bg-[#fbfdff] px-2.5 text-[11px] font-semibold leading-none text-[#315b9a] transition hover:border-[#bdd1ea] hover:bg-[#f5f9ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0]"
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

      <HomeFeedPreview data={homeFeed} />
    </main>
  );
}
