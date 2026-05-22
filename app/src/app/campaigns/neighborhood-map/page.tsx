import Image from "next/image";
import type { Metadata } from "next";
import { PostType } from "@prisma/client";

import {
  AcquisitionEventTracker,
  AcquisitionTrackedLink,
} from "@/components/analytics/acquisition-event-tracker";
import { FoundingMemberBadge } from "@/components/user/founding-member-badge";
import { NEIGHBORHOOD_MAP_CAMPAIGN_PATH } from "@/lib/campaign-pages";
import {
  getOfflinePartnerQrChannelBySource,
  listOfflinePartnerQrChannels,
} from "@/lib/offline-partner-campaign";
import { buildPostCreateTemplateHref } from "@/lib/post-create-templates";
import { getNeighborhoodMapCampaignStats } from "@/server/queries/campaign.queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "우리 동네 반려생활 지도 만들기",
  description:
    "산책코스, 병원 방문 경험, 동반가능 장소, 분실동물 공유, 중고용품 글을 모아 동네 반려생활 지도를 함께 만듭니다.",
  alternates: {
    canonical: NEIGHBORHOOD_MAP_CAMPAIGN_PATH,
  },
  openGraph: {
    title: "TownPet | 우리 동네 반려생활 지도 만들기",
    description:
      "가입보다 첫 제보가 먼저입니다. 우리 동네 반려생활 정보를 함께 모아 주세요.",
    url: NEIGHBORHOOD_MAP_CAMPAIGN_PATH,
  },
};

const PARTICIPATION_STEPS = [
  {
    label: "산책코스 추천",
    description: "대형견 적합 여부, 혼잡 시간, 목줄 주의 구간을 남겨 주세요.",
    href: buildPostCreateTemplateHref({
      templateId: "walk_route_large_dog",
      type: PostType.WALK_ROUTE,
    }),
    cta: "산책코스 쓰기",
  },
  {
    label: "병원 방문 경험 공유",
    description: "방문 목적, 대기, 설명 충분성, 야간 진료 여부를 경험 중심으로 기록합니다.",
    href: buildPostCreateTemplateHref({
      templateId: "hospital_review",
      type: PostType.HOSPITAL_REVIEW,
    }),
    cta: "병원 경험 쓰기",
  },
  {
    label: "동반가능 장소 제보",
    description: "카페, 매장, 공원처럼 반려동물과 함께 갈 수 있는 장소 정보를 모읍니다.",
    href: buildPostCreateTemplateHref({
      templateId: "place_report",
      type: PostType.PRODUCT_REVIEW,
    }),
    cta: "장소 제보하기",
  },
  {
    label: "분실동물 게시판 공유",
    description: "실종 시간, 마지막 확인 위치, 외형 특징을 구조화해 빠르게 퍼뜨립니다.",
    href: "/lost/new",
    cta: "분실/목격 등록",
  },
  {
    label: "중고용품 거래 글 작성",
    description: "이동장, 유모차, 자동급식기처럼 반려용품 맥락이 필요한 거래를 남깁니다.",
    href: buildPostCreateTemplateHref({
      templateId: "used_market",
      type: PostType.MARKET_LISTING,
    }),
    cta: "거래 글 쓰기",
  },
] as const;

const REWARDS = [
  "운영자 검수 후 Founding Member 배지 부여",
  "우수 제보자 메인 노출",
  "지역 쿠폰 또는 소액 기프티콘 후보",
] as const;

type CampaignSearchParams = Record<string, string | string[] | undefined>;

function formatCount(value: number) {
  return value.toLocaleString("ko-KR");
}

function getFirstSearchParamValue(
  searchParams: CampaignSearchParams,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function NeighborhoodMapCampaignPage({
  searchParams,
}: {
  searchParams?: Promise<CampaignSearchParams>;
}) {
  const stats = await getNeighborhoodMapCampaignStats();
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const sourceChannel = getOfflinePartnerQrChannelBySource(
    getFirstSearchParamValue(resolvedSearchParams, "utm_source"),
  );
  const offlinePartnerChannels = listOfflinePartnerQrChannels();
  const statItems = [
    { label: "병원 정보", value: stats.hospitalCount },
    { label: "산책코스", value: stats.walkRouteCount },
    { label: "장소·분실·거래 제보", value: stats.reportCount },
    { label: "창립 멤버", value: stats.contributorCount },
  ];

  return (
    <main className="tp-page-bg min-h-screen">
      <AcquisitionEventTracker
        event={{
          surface: "CAMPAIGN_NEIGHBORHOOD_MAP",
          event: "CAMPAIGN_VIEWED",
          targetType: "CAMPAIGN",
          targetId: "neighborhood_map",
          source: sourceChannel?.source ?? null,
        }}
      />
      <section className="mx-auto grid w-full max-w-[1180px] gap-7 px-4 py-9 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-10">
        <div className="min-w-0">
          <p className="tp-eyebrow">TownPet campaign</p>
          <h1 className="mt-4 max-w-[760px] text-4xl font-semibold leading-[1.08] text-[#10284a] break-keep sm:text-5xl">
            우리 동네 반려생활 지도 만들기
          </h1>
          <p className="mt-5 max-w-[680px] text-base leading-7 text-[#4f6f99] break-keep sm:text-lg">
            병원, 산책코스, 동반가능 장소, 분실동물, 중고용품 정보를 한 번 쓰고 끝나는
            이벤트가 아니라 동네 사람들이 계속 쓰는 정보 자산으로 모읍니다.
          </p>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <AcquisitionTrackedLink
              href="/posts/new"
              className="tp-btn-primary tp-btn-md inline-flex min-h-11 items-center justify-center px-5"
              event={{
                surface: "CAMPAIGN_NEIGHBORHOOD_MAP",
                event: "CAMPAIGN_CTA_CLICKED",
                targetType: "CTA",
                targetId: "hero_first_report",
              }}
            >
              첫 제보 남기기
            </AcquisitionTrackedLink>
            <AcquisitionTrackedLink
              href="/onboarding"
              className="tp-btn-soft tp-btn-md inline-flex min-h-11 items-center justify-center px-5"
              event={{
                surface: "CAMPAIGN_NEIGHBORHOOD_MAP",
                event: "ONBOARDING_CTA_CLICKED",
                targetType: "CTA",
                targetId: "hero_onboarding",
              }}
            >
              내 동네 설정하기
            </AcquisitionTrackedLink>
            <AcquisitionTrackedLink
              href="/feed/guest"
              className="tp-btn-soft tp-btn-md inline-flex min-h-11 items-center justify-center px-5"
              event={{
                surface: "CAMPAIGN_NEIGHBORHOOD_MAP",
                event: "FEED_CTA_CLICKED",
                targetType: "CTA",
                targetId: "hero_feed",
              }}
            >
              공개 피드 보기
            </AcquisitionTrackedLink>
          </div>
        </div>

        <aside className="overflow-hidden rounded-xl border border-[#d8e6f7] bg-[#f8fbff]">
          <div className="relative h-44 bg-[#eef5ff]">
            <Image
              src="/demo/adoption/maru.jpg"
              alt="동네 반려생활 정보를 함께 모으는 캠페인 이미지"
              fill
              sizes="(min-width: 1024px) 380px, 100vw"
              className="object-cover"
              priority
            />
          </div>
          <div className="px-4 py-4">
            <p className="text-sm font-semibold text-[#173963]">QR, DM, 블로그 CTA용 대표 링크</p>
            <p className="mt-2 break-all rounded-lg border border-[#dbe6f5] bg-white px-3 py-2 font-mono text-xs text-[#355988]">
              {NEIGHBORHOOD_MAP_CAMPAIGN_PATH}
            </p>
            <p className="mt-2 text-xs leading-5 text-[#5a7397]">
              특정 지역을 확정하기 전에는 이 링크로 캠페인을 안내하고, 사용자가 직접 동네를
              선택한 뒤 글을 남기게 합니다.
            </p>
            <div className="mt-4 divide-y divide-[#dbe6f5] border-y border-[#dbe6f5]">
              {offlinePartnerChannels.map((channel) => (
                <div key={channel.source} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#173963]">
                        {channel.partnerLabel}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#5a7397]">
                        {channel.qrLabel}
                      </p>
                    </div>
                    <AcquisitionTrackedLink
                      href={channel.primaryHref}
                      className="tp-btn-soft inline-flex min-h-8 shrink-0 items-center justify-center px-2.5 text-[11px] font-semibold"
                      event={{
                        surface: "CAMPAIGN_NEIGHBORHOOD_MAP",
                        event: "CAMPAIGN_CTA_CLICKED",
                        targetType: "CHANNEL",
                        targetId: channel.source,
                        source: channel.source,
                      }}
                    >
                      {channel.primaryCta}
                    </AcquisitionTrackedLink>
                  </div>
                  <p className="mt-2 break-all rounded-md bg-white px-2.5 py-1.5 font-mono text-[11px] leading-5 text-[#456894]">
                    {channel.landingHref}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-4 pb-10 sm:px-6 lg:px-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-[#dbe6f5] bg-white px-4 py-3"
            >
              <p className="text-xs font-semibold text-[#5a7397]">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold text-[#173963]">
                {formatCount(item.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-4 pb-12 sm:px-6 lg:px-10">
        <div className="border-y border-[#dbe6f5] py-5">
          <p className="tp-eyebrow">How to join</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#173963]">참여 방법</h2>
          <p className="mt-2 max-w-[720px] text-sm leading-6 text-[#5a7397]">
            완성도 높은 긴 글보다, 다음 사람이 바로 확인할 수 있는 정보 한 조각이 더 중요합니다.
          </p>
        </div>

        <div className="divide-y divide-[#e2ebf7] border-b border-[#dbe6f5]">
          {PARTICIPATION_STEPS.map((step, index) => (
            <div
              key={step.label}
              className="grid gap-3 py-4 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:items-center"
            >
              <span className="font-mono text-sm font-semibold text-[#6e87ab]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[#173963]">{step.label}</h3>
                <p className="mt-1 text-sm leading-6 text-[#5a7397]">{step.description}</p>
              </div>
              <AcquisitionTrackedLink
                href={step.href}
                className="tp-btn-soft inline-flex min-h-10 items-center justify-center px-3 text-xs font-semibold"
                event={{
                  surface: "CAMPAIGN_NEIGHBORHOOD_MAP",
                  event: "CAMPAIGN_CTA_CLICKED",
                  targetType: step.href.includes("template=") ? "TEMPLATE" : "CTA",
                  targetId: step.label,
                }}
              >
                {step.cta}
              </AcquisitionTrackedLink>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1180px] gap-5 px-4 pb-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-10">
        <div className="rounded-xl border border-[#dbe6f5] bg-white px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-[#173963]">보상 안내</h2>
            <FoundingMemberBadge />
          </div>
          <ul className="mt-3 grid gap-2">
            {REWARDS.map((reward) => (
              <li
                key={reward}
                className="rounded-lg border border-[#dbe6f5] bg-[#f8fbff] px-3 py-2 text-sm font-semibold text-[#355988]"
              >
                {reward}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-5 text-[#6b84a8]">
            창립 멤버 배지는 운영자 검수 후 수동 부여합니다. 자동 조건 부여와 보상 지급
            프로세스는 이후 운영 기준이 확정되면 분리합니다.
          </p>
        </div>

        <div className="rounded-xl border border-[#cbdcf5] bg-[#eef5ff] px-4 py-4">
          <p className="text-sm font-semibold text-[#173963]">운영 원칙</p>
          <p className="mt-2 text-sm leading-6 text-[#4f678d]">
            사용자가 선택한 동네 기준으로 모으고, 운영자 정리 콘텐츠와 사용자 경험담을
            분리합니다. 병원과 장소 정보는 방문 전 직접 확인할 수 있도록 정정 요청 경로를
            함께 둡니다.
          </p>
        </div>
      </section>
    </main>
  );
}
