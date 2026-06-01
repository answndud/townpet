import Link from "next/link";
import { PostType } from "@prisma/client";
import type { ReactNode } from "react";

import type { ReviewCategory } from "@/lib/review-category";

type FeedMode = "ALL" | "BEST";
type FeedPersonalized = "0" | "1";

type FeedControlHrefOptions = {
  nextType?: PostType | null;
  nextReviewCategory?: ReviewCategory | null;
  nextPage?: number | null;
  nextMode?: FeedMode | null;
  nextPersonalized?: FeedPersonalized;
};

type FeedControlPanelProps = {
  mode: FeedMode;
  reviewBoard: boolean;
  reviewCategory: ReviewCategory | null;
  makeHref: (options: FeedControlHrefOptions) => string;
  searchSlot?: ReactNode;
  personalized?: {
    active: boolean;
    currentLabel: string | null;
    title?: string | null;
    description?: string | null;
    emphasis?: string | null;
    profileHref?: string | null;
  } | null;
};

const REVIEW_FILTER_OPTIONS: Array<{ label: string; value?: ReviewCategory }> = [
  { label: "전체" },
  { label: "용품", value: "SUPPLIES" },
  { label: "사료", value: "FEED" },
  { label: "간식", value: "SNACK" },
  { label: "장난감", value: "TOY" },
  { label: "장소", value: "PLACE" },
  { label: "기타", value: "ETC" },
];

const PRIMARY_TAB_CLASS_NAME =
  "relative inline-flex h-8 items-center px-1 text-[13px] leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e89d8]/25";
const ACTIVE_PRIMARY_TAB_CLASS_NAME =
  "font-semibold text-[#1f4f8f] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#2f6fbd]";
const INACTIVE_PRIMARY_TAB_CLASS_NAME =
  "font-medium text-[#647b9f] hover:text-[#274f82]";
const FILTER_CHIP_CLASS_NAME =
  "inline-flex h-8 items-center rounded-[6px] border px-2.5 text-[11px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e89d8]/25";
const ACTIVE_FILTER_CHIP_CLASS_NAME = "border-[#a9c6ee] bg-[#eaf3ff] text-[#1f4f8f]";
const INACTIVE_FILTER_CHIP_CLASS_NAME =
  "border-[#d4e1f3] bg-white text-[#355f99] hover:border-[#bdd2ed] hover:bg-[#f6faff]";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="min-w-[38px] text-[10px] font-semibold leading-none text-[#4f6e97]">
      {children}
    </p>
  );
}

export function FeedControlPanel({
  mode,
  reviewBoard,
  reviewCategory,
  makeHref,
  searchSlot,
  personalized,
}: FeedControlPanelProps) {
  return (
    <section className="overflow-hidden border-y border-[#e3ebf6] bg-white sm:rounded-lg sm:border">
      <div className="border-b border-[#edf3fb] bg-[#fcfdff] px-3 py-1.5 sm:px-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="overflow-x-auto">
            <div className="flex min-w-max items-center gap-4">
              <p className="text-[12px] font-medium leading-none text-[#637da2]">
                피드
              </p>
              <div
                className="inline-flex items-center gap-5"
                role="tablist"
                aria-label="피드 보기"
              >
                <Link
                  href={makeHref({ nextMode: "ALL", nextPage: 1 })}
                  prefetch={false}
                  role="tab"
                  aria-selected={mode === "ALL"}
                  className={`${PRIMARY_TAB_CLASS_NAME} ${
                    mode === "ALL"
                      ? ACTIVE_PRIMARY_TAB_CLASS_NAME
                      : INACTIVE_PRIMARY_TAB_CLASS_NAME
                  }`}
                >
                  전체글
                </Link>
                <Link
                  href={makeHref({ nextMode: "BEST", nextPage: 1 })}
                  prefetch={false}
                  role="tab"
                  aria-selected={mode === "BEST"}
                  className={`${PRIMARY_TAB_CLASS_NAME} ${
                    mode === "BEST"
                      ? ACTIVE_PRIMARY_TAB_CLASS_NAME
                      : INACTIVE_PRIMARY_TAB_CLASS_NAME
                    }`}
                >
                  인기글
                </Link>
              </div>
            </div>
          </div>
          {searchSlot ? (
            <div className="min-w-0 md:ml-auto md:max-w-[460px]">
              {searchSlot}
            </div>
          ) : null}
        </div>

        {personalized ? (
          <div className="mt-1 border-t border-[#d9e6f7] pt-1">
            <div className="flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <SectionLabel>추천 방식</SectionLabel>
                <div className="flex flex-wrap items-center gap-1">
                  <Link
                    href={makeHref({ nextPersonalized: "0", nextPage: 1 })}
                    prefetch={false}
                    className={`${FILTER_CHIP_CLASS_NAME} ${
                      !personalized.active
                        ? ACTIVE_FILTER_CHIP_CLASS_NAME
                        : INACTIVE_FILTER_CHIP_CLASS_NAME
                    }`}
                  >
                    일반 추천
                  </Link>
                  <Link
                    href={makeHref({ nextPersonalized: "1", nextPage: 1 })}
                    prefetch={false}
                    className={`${FILTER_CHIP_CLASS_NAME} ${
                      personalized.active
                        ? ACTIVE_FILTER_CHIP_CLASS_NAME
                        : INACTIVE_FILTER_CHIP_CLASS_NAME
                    }`}
                  >
                    맞춤 추천
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1 text-[10px] text-[#5a7398]">
                <span className="font-semibold text-[#4b6b9b]">현재 기준</span>
                <span className="rounded-full border border-[#d7e4f6] bg-[#f6faff] px-2 py-0.5 font-medium text-[#476892]">
                  {personalized.currentLabel ?? "프로필 보강 필요"}
                </span>
              </div>
            </div>

            {personalized.active ? (
              <div className="mt-1 space-y-1 border-t border-[#edf3fb] pt-1">
                {personalized.title ? (
                  <p className="text-xs font-semibold text-[#173b6a]">{personalized.title}</p>
                ) : null}
                {personalized.description ? (
                  <p className="text-[11px] leading-4 text-[#5a7398]">{personalized.description}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  {personalized.emphasis ? (
                    <span className="rounded-full border border-[#c8daf5] bg-[#f3f8ff] px-2 py-0.5 font-semibold text-[#2f5da4]">
                      {personalized.emphasis}
                    </span>
                  ) : null}
                  {!personalized.currentLabel && personalized.profileHref ? (
                    <Link
                      href={personalized.profileHref}
                      prefetch={false}
                      className="font-semibold text-[#2f5da4] hover:text-[#244b86]"
                    >
                      반려동물 프로필 보강하기
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid bg-white px-2 py-1 sm:px-4">
        {reviewBoard ? (
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            <SectionLabel>리뷰</SectionLabel>
            <div className="flex shrink-0 items-center gap-1">
              {REVIEW_FILTER_OPTIONS.map((option) => {
                const isActive = (option.value ?? null) === (reviewCategory ?? null);
                return (
                  <Link
                    key={`feed-review-${option.value ?? "all"}`}
                    href={makeHref({
                      nextType: PostType.PRODUCT_REVIEW,
                      nextReviewCategory: option.value ?? null,
                      nextPage: 1,
                    })}
                    prefetch={false}
                    className={`${FILTER_CHIP_CLASS_NAME} ${
                      isActive
                        ? ACTIVE_FILTER_CHIP_CLASS_NAME
                        : INACTIVE_FILTER_CHIP_CLASS_NAME
                    }`}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
