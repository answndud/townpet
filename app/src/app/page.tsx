import type { Metadata } from "next";
import Link from "next/link";

import { HomeFeedPreview } from "@/components/home/home-feed-preview";

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
  { label: "분실/목격", href: "/feed/guest?type=LOST_FOUND" },
  { label: "동물병원", href: "/feed/guest?type=HOSPITAL_REVIEW" },
  { label: "산책코스", href: "/feed/guest?type=WALK_ROUTE" },
  { label: "질문/답변", href: "/feed/guest?type=QA_QUESTION" },
  { label: "중고거래", href: "/feed/guest?type=MARKET_LISTING" },
];

export default function HomePage() {
  return (
    <main className="tp-page-bg min-h-screen">
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
            <Link
              href="/onboarding"
              className="tp-btn-primary tp-btn-md inline-flex min-h-11 items-center justify-center px-5"
            >
              내 동네 허브 시작하기
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-4 pb-10 sm:px-6 lg:px-10">
        <div className="border-y border-[#dbe6f5] py-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div>
            <p className="text-sm font-semibold text-[#173963]">
              관심 주제별로 둘러보기
            </p>
            <p className="mt-1 text-sm leading-6 text-[#5a7397]">
              분실/목격, 병원 후기, 산책코스처럼 반복해서 필요한 정보를 주제별로 확인하세요.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">
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
