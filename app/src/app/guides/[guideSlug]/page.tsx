import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  AcquisitionEventTracker,
  AcquisitionTrackedLink,
} from "@/components/analytics/acquisition-event-tracker";
import {
  getGuidePageBySlug,
  listGuidePages,
  type GuidePage,
} from "@/lib/guide-pages";

type GuidePageProps = {
  params: Promise<{
    guideSlug: string;
  }>;
};

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return listGuidePages().map((guide) => ({ guideSlug: guide.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { guideSlug } = await params;
  const guide = getGuidePageBySlug(guideSlug);

  if (!guide) {
    return {
      title: "가이드를 찾을 수 없습니다",
      robots: { index: false, follow: false },
    };
  }

  const path = `/guides/${guide.slug}`;

  return {
    title: guide.title,
    description: guide.description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: `TownPet | ${guide.title}`,
      description: guide.description,
      url: path,
    },
  };
}

function GuideSection({ guide }: { guide: GuidePage }) {
  return (
    <article className="mx-auto w-full max-w-[980px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <AcquisitionEventTracker
        event={{
          surface: "GUIDE",
          event: "GUIDE_VIEWED",
          targetType: "GUIDE",
          targetId: guide.slug,
        }}
      />
      <div className="max-w-[760px]">
        <p className="tp-eyebrow">{guide.intentLabel}</p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight text-[#10284a] break-keep sm:text-4xl">
          {guide.title}
        </h1>
        <p className="mt-4 text-base leading-7 text-[#4f6f99] break-keep">
          {guide.lead}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <AcquisitionTrackedLink
            href={guide.primaryCta.href}
            className="tp-btn-primary tp-btn-md inline-flex min-h-10 items-center justify-center px-4"
            event={{
              surface: "GUIDE",
              event: "GUIDE_CTA_CLICKED",
              targetType: "GUIDE",
              targetId: `${guide.slug}:primary`,
            }}
          >
            {guide.primaryCta.label}
          </AcquisitionTrackedLink>
          {guide.secondaryCta ? (
            <AcquisitionTrackedLink
              href={guide.secondaryCta.href}
              className="tp-btn-soft tp-btn-md inline-flex min-h-10 items-center justify-center px-4"
              event={{
                surface: "GUIDE",
                event: "GUIDE_CTA_CLICKED",
                targetType: "GUIDE",
                targetId: `${guide.slug}:secondary`,
              }}
            >
              {guide.secondaryCta.label}
            </AcquisitionTrackedLink>
          ) : null}
        </div>
      </div>

      <div className="mt-8 border-y border-[#dbe6f5]">
        {guide.sections.map((section, sectionIndex) => (
          <section
            key={section.title}
            className="grid gap-3 border-b border-[#e4edf8] py-5 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8"
          >
            <div>
              <p className="text-xs font-semibold text-[#315b9a]">
                {String(sectionIndex + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-1 text-base font-semibold text-[#173963]">
                {section.title}
              </h2>
            </div>
            <ul className="space-y-2 text-sm leading-6 text-[#465f84]">
              {section.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8aa8d2]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-6 rounded-[10px] border border-[#dbe6f6] bg-[#f8fbff] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#173963]">주의할 점</h2>
        <p className="mt-1 text-sm leading-6 text-[#5a7397]">{guide.caution}</p>
      </section>

      <nav className="mt-8 border-t border-[#dbe6f5] pt-5">
        <p className="text-sm font-semibold text-[#173963]">다른 가이드</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {listGuidePages()
            .filter((item) => item.slug !== guide.slug)
            .map((item) => (
              <AcquisitionTrackedLink
                key={item.slug}
                href={`/guides/${item.slug}`}
                className="tp-filter-pill min-h-[1.875rem] px-2.5 py-1 text-[11px]"
                event={{
                  surface: "GUIDE",
                  event: "GUIDE_CTA_CLICKED",
                  targetType: "GUIDE",
                  targetId: `${guide.slug}:related:${item.slug}`,
                }}
              >
                {item.intentLabel}
              </AcquisitionTrackedLink>
            ))}
        </div>
      </nav>
    </article>
  );
}

export default async function GuidePageRoute({ params }: GuidePageProps) {
  const { guideSlug } = await params;
  const guide = getGuidePageBySlug(guideSlug);

  if (!guide) {
    notFound();
  }

  return (
    <main className="tp-page-bg min-h-screen">
      <GuideSection guide={guide} />
    </main>
  );
}
