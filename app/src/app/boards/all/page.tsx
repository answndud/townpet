import Link from "next/link";

import { COMMON_BOARD_NAV_ITEMS } from "@/lib/community-board";
import { createPublicPageMetadata } from "@/lib/page-metadata";

export const metadata = createPublicPageMetadata({
  title: "전체 공통게시판",
  description: "입양, 분실·목격, 병원 후기와 생활 게시판을 한 곳에서 확인합니다.",
  path: "/boards/all",
});

export default function AllCommonBoardsPage() {
  return (
    <main className="tp-page-bg min-h-screen pb-16">
      <div className="mx-auto w-full max-w-[1320px] px-3 py-4 sm:px-4 sm:py-5 lg:px-6">
        <section className="tp-hero px-4 py-3 sm:px-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#667085]">
            공통 게시판
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#101828] sm:text-2xl">
            전체 공통게시판
          </h1>
        </section>

        <section className="mt-3 overflow-hidden border border-[#e4e7ec] bg-white sm:rounded-lg" aria-labelledby="common-board-list-title">
          <header className="border-b border-[#e4e7ec] px-4 py-2.5 sm:px-5">
            <h2 id="common-board-list-title" className="text-sm font-semibold text-[#101828]">
              공통 게시판 목록
            </h2>
            <p className="mt-0.5 text-xs text-[#667085]">
              특정 동물에 종속되지 않는 생활·정보 게시판입니다.
            </p>
          </header>
          <nav aria-label="공통 게시판 목록">
            {COMMON_BOARD_NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="flex min-h-11 items-center justify-between border-b border-[#e4e7ec] px-4 text-sm font-semibold text-[#344054] transition-colors last:border-b-0 hover:bg-[#f8f9ff] hover:text-[#4338ca] sm:px-5"
              >
                <span>{item.label}</span>
                <span aria-hidden="true" className="text-[#98a2b3]">›</span>
              </Link>
            ))}
          </nav>
        </section>
      </div>
    </main>
  );
}
