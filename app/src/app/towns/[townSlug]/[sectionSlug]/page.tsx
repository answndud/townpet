import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  AcquisitionEventTracker,
  AcquisitionTrackedLink,
} from "@/components/analytics/acquisition-event-tracker";
import { getTownLandingSection } from "@/lib/town-landing";
import { getTownLandingByNeighborhoodSlug } from "@/server/queries/neighborhood.queries";
import { isPrismaDatabaseUnavailableError } from "@/server/prisma-database-error";

type TownSectionPageProps = {
  params: Promise<{ townSlug?: string; sectionSlug?: string }>;
};

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: TownSectionPageProps): Promise<Metadata> {
  const { townSlug = "", sectionSlug = "" } = await params;
  const town = await getTownLandingByNeighborhoodSlug(townSlug).catch((error) => {
    if (isPrismaDatabaseUnavailableError(error)) {
      return null;
    }
    throw error;
  });
  const resolved = town
    ? getTownLandingSection(town, sectionSlug)
    : null;
  if (!resolved) {
    return {
      title: "지역 정보를 찾을 수 없습니다",
      robots: { index: false, follow: false },
    };
  }

  const { section } = resolved;
  const description = `${section.description} ${section.searchIntents.join(", ")} 정보를 ${resolved.town.label} 기준으로 확인하고 제보할 수 있습니다.`;
  return {
    title: section.title,
    description,
    alternates: {
      canonical: section.href,
    },
    openGraph: {
      title: `TownPet ${section.title}`,
      description,
      url: section.href,
    },
  };
}

export default async function TownSectionPage({ params }: TownSectionPageProps) {
  const { townSlug = "", sectionSlug = "" } = await params;
  const townLanding = await getTownLandingByNeighborhoodSlug(townSlug).catch((error) => {
    if (isPrismaDatabaseUnavailableError(error)) {
      return null;
    }
    throw error;
  });
  const resolved = townLanding
    ? getTownLandingSection(townLanding, sectionSlug)
    : null;
  if (!resolved) {
    notFound();
  }

  const { town, section } = resolved;

  return (
    <main className="tp-page-bg min-h-screen">
      <AcquisitionEventTracker
        event={{
          surface: "TOWN_SECTION",
          event: "TOWN_SECTION_VIEWED",
          targetType: "TOWN_SECTION",
          targetId: `${town.slug}:${section.slug}`,
        }}
      />
      <section className="mx-auto w-full max-w-[980px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
        <AcquisitionTrackedLink
          href={town.href}
          className="text-sm font-semibold text-[#315b9a]"
          event={{
            surface: "TOWN_SECTION",
            event: "TOWN_CATEGORY_CLICKED",
            targetType: "TOWN",
            targetId: town.slug,
          }}
        >
          {town.label} 전체
        </AcquisitionTrackedLink>
        <p className="tp-eyebrow mt-6">Town guide</p>
        <h1 className="mt-4 max-w-[760px] text-4xl font-semibold leading-[1.08] text-[#10284a] break-keep sm:text-5xl">
          {section.title}
        </h1>
        <p className="mt-5 max-w-[700px] text-base leading-7 text-[#4f6f99] break-keep sm:text-lg">
          {section.description}
        </p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <AcquisitionTrackedLink
            href={section.feedHref}
            className="tp-btn-primary tp-btn-md inline-flex min-h-11 items-center justify-center px-5"
            event={{
              surface: "TOWN_SECTION",
              event: "FEED_CTA_CLICKED",
              targetType: "TOWN_SECTION",
              targetId: `${town.slug}:${section.slug}`,
            }}
          >
            관련 글
          </AcquisitionTrackedLink>
          <AcquisitionTrackedLink
            href={section.writeHref}
            className="tp-btn-soft tp-btn-md inline-flex min-h-11 items-center justify-center px-5"
            event={{
              surface: "TOWN_SECTION",
              event: "WRITE_TEMPLATE_OPENED",
              targetType: "TOWN_SECTION",
              targetId: `${town.slug}:${section.slug}`,
            }}
          >
            {section.primaryActionLabel}
          </AcquisitionTrackedLink>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="tp-soft-card p-5">
            <h2 className="text-lg font-semibold text-[#173963]">현재 상태</h2>
            <p className="mt-2 text-sm font-semibold text-[#315b9a]">
              등록된 글 {section.count ?? 0}개
            </p>
            <p className="mt-2 text-sm leading-6 text-[#5a7397]">{section.emptyState}</p>
            <p className="mt-4 text-sm leading-6 text-[#5a7397]">
              운영자 정리 콘텐츠와 사용자 제보를 분리해서 쌓을 예정입니다. 사용자는 공개
              피드에서 관련 글을 먼저 확인하고, 필요한 정보를 직접 제보할 수 있습니다.
            </p>
            <div className="mt-4 border-t border-[#e3edf8] pt-4">
              <h2 className="text-sm font-semibold text-[#173963]">자주 찾는 정보</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {section.searchIntents.map((intent) => (
                  <span
                    key={intent}
                    className="rounded-sm bg-white px-2.5 py-1 text-xs font-medium text-[#48688f] ring-1 ring-[#dce7f5]"
                  >
                    {intent}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <aside className="tp-card p-5">
            <h2 className="text-sm font-semibold text-[#173963]">확인 기준</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5a7397]">
              {section.checklist.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <p className="mt-4 border-t border-[#e3edf8] pt-4 text-xs leading-5 text-[#6b82a4]">
              운영자 정리는 공개 출처와 확인 일자를 남기고, 사용자 제보는 경험과 목격
              사실을 중심으로 받습니다.
            </p>
          </aside>
        </section>
      </section>
    </main>
  );
}
