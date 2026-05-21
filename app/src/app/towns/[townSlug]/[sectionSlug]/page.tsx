import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getTownLandingSection,
  TOWN_LANDING,
} from "@/lib/town-landing";

type TownSectionPageProps = {
  params: Promise<{ townSlug?: string; sectionSlug?: string }>;
};

export function generateStaticParams() {
  return TOWN_LANDING.sections.map((section) => ({
    townSlug: TOWN_LANDING.slug,
    sectionSlug: section.slug,
  }));
}

export async function generateMetadata({ params }: TownSectionPageProps): Promise<Metadata> {
  const { townSlug = "", sectionSlug = "" } = await params;
  const resolved = getTownLandingSection(townSlug, sectionSlug);
  if (!resolved) {
    return {
      title: "지역 정보를 찾을 수 없습니다",
      robots: { index: false, follow: false },
    };
  }

  const { section } = resolved;
  return {
    title: section.title,
    description: section.description,
    alternates: {
      canonical: section.href,
    },
    openGraph: {
      title: `TownPet ${section.title}`,
      description: section.description,
      url: section.href,
    },
  };
}

export default async function TownSectionPage({ params }: TownSectionPageProps) {
  const { townSlug = "", sectionSlug = "" } = await params;
  const resolved = getTownLandingSection(townSlug, sectionSlug);
  if (!resolved) {
    notFound();
  }

  const { town, section } = resolved;

  return (
    <main className="tp-page-bg min-h-screen">
      <section className="mx-auto w-full max-w-[980px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
        <Link href={town.href} className="text-sm font-semibold text-[#315b9a]">
          {town.label} 전체 보기
        </Link>
        <p className="tp-eyebrow mt-6">Town guide</p>
        <h1 className="mt-4 max-w-[760px] text-4xl font-semibold leading-[1.08] text-[#10284a] break-keep sm:text-5xl">
          {section.title}
        </h1>
        <p className="mt-5 max-w-[700px] text-base leading-7 text-[#4f6f99] break-keep sm:text-lg">
          {section.description}
        </p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href={section.feedHref} className="tp-btn-primary tp-btn-md inline-flex min-h-11 items-center justify-center px-5">
            관련 글 보기
          </Link>
          <Link href="/posts/new" className="tp-btn-soft tp-btn-md inline-flex min-h-11 items-center justify-center px-5">
            정보 제보하기
          </Link>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="tp-soft-card p-5">
            <h2 className="text-lg font-semibold text-[#173963]">현재 상태</h2>
            <p className="mt-2 text-sm leading-6 text-[#5a7397]">{section.emptyState}</p>
            <p className="mt-4 text-sm leading-6 text-[#5a7397]">
              운영자 정리 콘텐츠와 사용자 제보를 분리해서 쌓을 예정입니다. 사용자는 공개
              피드에서 관련 글을 먼저 확인하고, 필요한 정보를 직접 제보할 수 있습니다.
            </p>
          </div>
          <aside className="tp-card p-5">
            <h2 className="text-sm font-semibold text-[#173963]">확인 기준</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5a7397]">
              {section.checklist.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </aside>
        </section>
      </section>
    </main>
  );
}
