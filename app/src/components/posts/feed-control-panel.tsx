import Link from "next/link";
import { PostType } from "@prisma/client";
import type { ReactNode } from "react";

import type { ReviewCategory } from "@/lib/review-category";

type FeedMode = "ALL" | "BEST";
type FeedSort = "LATEST" | "LIKE" | "COMMENT";
type FeedPersonalized = "0" | "1";
type FeedPeriod = 3 | 7 | 30;
type BestDay = 3 | 7 | 30;

type FeedControlHrefOptions = {
  nextType?: PostType | null;
  nextReviewCategory?: ReviewCategory | null;
  nextPage?: number | null;
  nextMode?: FeedMode | null;
  nextDays?: BestDay | null;
  nextPeriod?: FeedPeriod | null;
  nextSort?: FeedSort | null;
  nextPersonalized?: FeedPersonalized;
};

type FeedControlPanelProps = {
  mode: FeedMode;
  selectedSort: FeedSort;
  bestDays: BestDay;
  periodDays: FeedPeriod | null;
  reviewBoard: boolean;
  reviewCategory: ReviewCategory | null;
  makeHref: (options: FeedControlHrefOptions) => string;
  personalized?: {
    active: boolean;
    currentLabel: string | null;
    title?: string | null;
    description?: string | null;
    emphasis?: string | null;
    profileHref?: string | null;
  } | null;
};

const BEST_DAY_OPTIONS = [3, 7, 30] as const;
const FEED_PERIOD_OPTIONS = [3, 7, 30] as const;
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
  "inline-flex h-[28px] items-center rounded-md border px-2 text-[11px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e89d8]/25";
const ACTIVE_PRIMARY_TAB_CLASS_NAME =
  "border-[#3567b5] bg-[#3567b5] text-white";
const INACTIVE_PRIMARY_TAB_CLASS_NAME =
  "border-[#d5e3f5] bg-white text-[#315b9a] hover:border-[#b8cceb] hover:bg-[#f5f9ff]";
const FILTER_CHIP_CLASS_NAME =
  "inline-flex h-[28px] items-center rounded-md border px-2 text-[11px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e89d8]/25";
const ACTIVE_FILTER_CHIP_CLASS_NAME = "border-[#3567b5] bg-[#3567b5] text-white";
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
  selectedSort,
  bestDays,
  periodDays,
  reviewBoard,
  reviewCategory,
  makeHref,
  personalized,
}: FeedControlPanelProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#dce7f7] bg-white">
      <div className="border-b border-[#dde8f7] bg-[#f8fbff] px-3 py-1 sm:px-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="text-[10px] font-semibold leading-none text-[#4f6e97]">
              피드 보기
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <Link
                href={makeHref({ nextMode: "ALL", nextPage: 1 })}
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
                className={`${PRIMARY_TAB_CLASS_NAME} ${
                  mode === "BEST"
                    ? ACTIVE_PRIMARY_TAB_CLASS_NAME
                    : INACTIVE_PRIMARY_TAB_CLASS_NAME
                }`}
              >
                베스트글
              </Link>
            </div>
          </div>
        </div>

        {personalized ? (
          <div className="mt-1 border-t border-[#d9e6f7] pt-1">
            <div className="flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <SectionLabel>추천 방식</SectionLabel>
                <div className="flex flex-wrap items-center gap-1">
                  <Link
                    href={makeHref({ nextPersonalized: "0", nextPage: 1 })}
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

      <div className="grid bg-white px-3 py-1 sm:px-5">
        <div
          data-testid="feed-sort-range-row"
          className="flex flex-col gap-1 py-1 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2"
        >
          <div className="flex flex-wrap items-center gap-1">
            <SectionLabel>정렬</SectionLabel>
            <div className="flex flex-wrap items-center gap-1">
              {([
                { value: "LATEST", label: "최신" },
                { value: "LIKE", label: "좋아요" },
                { value: "COMMENT", label: "댓글" },
              ] as const).map((option) => (
                <Link
                  key={`feed-sort-${option.value}`}
                  href={makeHref({
                    nextMode: "ALL",
                    nextSort: option.value,
                    nextPersonalized: "0",
                    nextPage: 1,
                  })}
                  className={`${FILTER_CHIP_CLASS_NAME} ${
                    mode === "ALL" && selectedSort === option.value
                      ? ACTIVE_FILTER_CHIP_CLASS_NAME
                      : INACTIVE_FILTER_CHIP_CLASS_NAME
                  }`}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden h-4 w-px bg-[#dbe6f6] lg:block" aria-hidden="true" />

          <div className="flex flex-wrap items-center gap-1">
            <SectionLabel>{mode === "ALL" ? "기간" : "집계 기간"}</SectionLabel>
            <div className="flex flex-wrap items-center gap-1">
              {mode === "ALL" ? (
                <>
                  <Link
                    href={makeHref({
                      nextMode: "ALL",
                      nextPeriod: null,
                      nextPersonalized: "0",
                      nextPage: 1,
                    })}
                    className={`${FILTER_CHIP_CLASS_NAME} ${
                      !periodDays
                        ? ACTIVE_FILTER_CHIP_CLASS_NAME
                        : INACTIVE_FILTER_CHIP_CLASS_NAME
                    }`}
                  >
                    전체
                  </Link>
                  {FEED_PERIOD_OPTIONS.map((day) => (
                    <Link
                      key={`feed-period-${day}`}
                      href={makeHref({
                        nextMode: "ALL",
                        nextPeriod: day,
                        nextPersonalized: "0",
                        nextPage: 1,
                      })}
                      className={`${FILTER_CHIP_CLASS_NAME} ${
                        periodDays === day
                          ? ACTIVE_FILTER_CHIP_CLASS_NAME
                          : INACTIVE_FILTER_CHIP_CLASS_NAME
                      }`}
                    >
                      {day}일
                    </Link>
                  ))}
                </>
              ) : (
                <>
                  {BEST_DAY_OPTIONS.map((day) => (
                    <Link
                      key={`feed-best-day-${day}`}
                      href={makeHref({ nextDays: day, nextPage: 1 })}
                      className={`${FILTER_CHIP_CLASS_NAME} ${
                        bestDays === day
                          ? ACTIVE_FILTER_CHIP_CLASS_NAME
                          : INACTIVE_FILTER_CHIP_CLASS_NAME
                      }`}
                    >
                      최근 {day}일
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {reviewBoard ? (
          <div className="flex flex-wrap items-center gap-1 py-1">
            <SectionLabel>리뷰</SectionLabel>
            <div className="flex flex-wrap items-center gap-1">
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
