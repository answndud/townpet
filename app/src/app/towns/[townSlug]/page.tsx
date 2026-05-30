import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  AcquisitionEventTracker,
  AcquisitionTrackedLink,
} from "@/components/analytics/acquisition-event-tracker";
import { getTownLandingByNeighborhoodSlug } from "@/server/queries/neighborhood.queries";
import { isPrismaDatabaseUnavailableError } from "@/server/prisma-database-error";

type TownPageProps = {
  params: Promise<{ townSlug?: string }>;
};

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: TownPageProps): Promise<Metadata> {
  const { townSlug = "" } = await params;
  const town = await getTownLandingByNeighborhoodSlug(townSlug).catch((error) => {
    if (isPrismaDatabaseUnavailableError(error)) {
      return null;
    }
    throw error;
  });
  if (!town) {
    return {
      title: "지역 허브를 찾을 수 없습니다",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: town.headline,
    description: town.description,
    alternates: {
      canonical: town.href,
    },
    openGraph: {
      title: `TownPet ${town.headline}`,
      description: town.description,
      url: town.href,
    },
  };
}

export default async function TownPage({ params }: TownPageProps) {
  const { townSlug = "" } = await params;
  const town = await getTownLandingByNeighborhoodSlug(townSlug).catch((error) => {
    if (isPrismaDatabaseUnavailableError(error)) {
      return null;
    }
    throw error;
  });
  if (!town) {
    notFound();
  }

  return (
    <main className="tp-page-bg min-h-screen">
      <AcquisitionEventTracker
        event={{
          surface: "TOWN_LANDING",
          event: "TOWN_LANDING_VIEWED",
          targetType: "TOWN",
          targetId: town.slug,
        }}
      />
      <section className="mx-auto w-full max-w-[1180px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
        <p className="tp-eyebrow">Town guide</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div>
            <h1 className="max-w-[720px] text-4xl font-semibold leading-[1.08] text-[#10284a] break-keep sm:text-5xl">
              {town.headline}
            </h1>
            <p className="mt-5 max-w-[700px] text-base leading-7 text-[#4f6f99] break-keep sm:text-lg">
              {town.description}
            </p>
            <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <AcquisitionTrackedLink
                href="/onboarding"
                className="tp-btn-primary tp-btn-md inline-flex min-h-11 items-center justify-center px-5"
                event={{
                  surface: "TOWN_LANDING",
                  event: "ONBOARDING_CTA_CLICKED",
                  targetType: "TOWN",
                  targetId: town.slug,
                }}
              >
                내 동네 설정하기
              </AcquisitionTrackedLink>
              <AcquisitionTrackedLink
                href="/posts/new?type=LOST_FOUND"
                className="tp-btn-soft tp-btn-md inline-flex min-h-11 items-center justify-center px-5"
                event={{
                  surface: "TOWN_LANDING",
                  event: "WRITE_TEMPLATE_OPENED",
                  targetType: "POST_TYPE",
                  targetId: "LOST_FOUND",
                }}
              >
                분실동물 등록하기
              </AcquisitionTrackedLink>
              <AcquisitionTrackedLink
                href="/feed/guest"
                className="tp-btn-soft tp-btn-md inline-flex min-h-11 items-center justify-center px-5"
                event={{
                  surface: "TOWN_LANDING",
                  event: "FEED_CTA_CLICKED",
                  targetType: "TOWN",
                  targetId: town.slug,
                }}
              >
                공개 피드
              </AcquisitionTrackedLink>
            </div>
          </div>

          <aside className="tp-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4e6f9f]">
              초기 운영 범위
            </p>
            <p className="mt-2 text-xl font-semibold text-[#173963]">{town.label}</p>
            <p className="mt-2 text-sm leading-6 text-[#5a7397]">
              사용자가 선택한 동네를 기준으로 정보를 모읍니다. 운영자 콘텐츠와 사용자
              제보를 구분해 쌓아갈 예정입니다.
            </p>
            <div className="mt-4 border-t border-[#e3edf8] pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b82a4]">
                먼저 찾는 정보
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {town.sections.flatMap((section) =>
                  section.searchIntents.slice(0, 1).map((intent) => (
                    <span
                      key={`${section.slug}:${intent}`}
                      className="rounded-sm border border-[#dce7f5] bg-white px-2.5 py-1 text-xs font-medium text-[#48688f]"
                    >
                      {intent}
                    </span>
                  )),
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1180px] gap-3 px-4 pb-12 sm:px-6 md:grid-cols-2 lg:px-10">
        {town.sections.map((section) => (
          <AcquisitionTrackedLink
            key={section.slug}
            href={section.href}
            className="tp-card group flex min-h-[210px] flex-col gap-4 p-5 transition hover:border-[#aac5ec] hover:shadow-[0_12px_28px_rgba(30,63,116,0.08)]"
            event={{
              surface: "TOWN_LANDING",
              event: "TOWN_CATEGORY_CLICKED",
              targetType: "TOWN_SECTION",
              targetId: `${town.slug}:${section.slug}`,
            }}
          >
            <div>
              <p className="text-xs font-semibold text-[#315b9a]">{section.shortTitle}</p>
              <h2 className="mt-2 text-xl font-semibold text-[#173963] group-hover:text-[#214d8d]">
                {section.title}
              </h2>
              <p className="mt-2 text-sm font-semibold text-[#315b9a]">
                등록된 글 {section.count ?? 0}개
              </p>
              <p className="mt-2 text-sm leading-6 text-[#5a7397]">{section.description}</p>
            </div>
            <div className="mt-auto space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {section.searchIntents.map((intent) => (
                  <span
                    key={intent}
                    className="rounded-sm bg-[#f1f6fd] px-2 py-1 text-xs font-medium text-[#48688f]"
                  >
                    {intent}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-[#e3edf8] pt-3">
                <span className="text-xs leading-5 text-[#6b82a4]">{section.emptyState}</span>
                <span className="shrink-0 text-sm font-semibold text-[#315b9a]">
                  {section.primaryActionLabel}
                </span>
              </div>
            </div>
          </AcquisitionTrackedLink>
        ))}
      </section>
    </main>
  );
}
