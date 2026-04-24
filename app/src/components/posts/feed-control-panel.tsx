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
  "inline-flex min-h-8 items-center rounded-lg border px-2 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e89d8]/25";
const ACTIVE_PRIMARY_TAB_CLASS_NAME =
  "border-[#3567b5] bg-[#3567b5] text-white";
const INACTIVE_PRIMARY_TAB_CLASS_NAME =
  "border-[#d5e3f5] bg-white text-[#315b9a] hover:border-[#b8cceb] hover:bg-[#f5f9ff]";
const FILTER_CHIP_CLASS_NAME =
  "inline-flex min-h-8 items-center rounded-lg border px-2 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e89d8]/25";
const ACTIVE_FILTER_CHIP_CLASS_NAME = "border-[#3567b5] bg-[#3567b5] text-white";
const INACTIVE_FILTER_CHIP_CLASS_NAME =
  "border-[#d4e1f3] bg-white text-[#355f99] hover:border-[#bdd2ed] hover:bg-[#f6faff]";

function getSortLabel(sort: FeedSort) {
  if (sort === "LIKE") {
    return "좋아요순";
  }
  if (sort === "COMMENT") {
    return "댓글순";
  }
  return "최신순";
}

function getRangeLabel(mode: FeedMode, periodDays: FeedPeriod | null, bestDays: BestDay) {
  if (mode === "BEST") {
    return `최근 ${bestDays}일`;
  }

  if (periodDays) {
    return `최근 ${periodDays}일`;
  }

  return "전체 기간";
}

function SummaryPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#d7e4f6] bg-white px-2 py-0.5 text-[10px] font-medium text-[#4f6e97]">
      {label}
    </span>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="min-w-[44px] text-[11px] font-semibold text-[#4f6e97]">
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
  const selectedSortLabel = getSortLabel(selectedSort);
  const rangeLabel = getRangeLabel(mode, periodDays, bestDays);

  return (
    <section className="overflow-hidden rounded-xl border border-[#dce7f7] bg-white">
      <div className="border-b border-[#dde8f7] bg-[#f8fbff] px-3 py-2 sm:px-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b86ab]">
              피드 보기
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
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

          <div className="flex flex-wrap items-center gap-1.5">
            <SummaryPill label={mode === "BEST" ? "베스트 기준" : "전체 피드"} />
            <SummaryPill label={selectedSortLabel} />
            <SummaryPill label={rangeLabel} />
            {personalized ? (
              <SummaryPill label={personalized.active ? "맞춤 추천" : "일반 추천"} />
            ) : null}
          </div>
        </div>

        {personalized ? (
          <div className="mt-2 border-t border-[#d9e6f7] pt-2">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1.5">
                <SectionLabel>추천 방식</SectionLabel>
                <div className="flex flex-wrap items-center gap-1.5">
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

              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#5a7398]">
                <span className="font-semibold text-[#4b6b9b]">현재 기준</span>
                <span className="rounded-full border border-[#d7e4f6] bg-[#f6faff] px-2 py-0.5 font-medium text-[#476892]">
                  {personalized.currentLabel ?? "프로필 보강 필요"}
                </span>
              </div>
            </div>

            {personalized.active ? (
              <div className="mt-2 space-y-1.5 border-t border-[#edf3fb] pt-2">
                {personalized.title ? (
                  <p className="text-sm font-semibold text-[#173b6a]">{personalized.title}</p>
                ) : null}
                {personalized.description ? (
                  <p className="text-xs leading-5 text-[#5a7398]">{personalized.description}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
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
          className="flex flex-col gap-2 py-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4"
        >
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <SectionLabel>정렬</SectionLabel>
            <div className="flex flex-wrap items-center gap-1">
              {([
                { value: "LATEST", label: "최신" },
                { value: "LIKE", label: "좋아요" },
                { value: "COMMENT", label: "댓글" },
              ] as const).map((option) => (
                <Link
                  key={`feed-sort-${option.value}`}
                  href={makeHref({ nextSort: option.value, nextPage: 1 })}
                  className={`${FILTER_CHIP_CLASS_NAME} ${
                    selectedSort === option.value
                      ? ACTIVE_FILTER_CHIP_CLASS_NAME
                      : INACTIVE_FILTER_CHIP_CLASS_NAME
                  }`}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden h-6 w-px bg-[#dbe6f6] lg:block" aria-hidden="true" />

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <SectionLabel>{mode === "ALL" ? "기간" : "집계 기간"}</SectionLabel>
            <div className="flex flex-wrap items-center gap-1">
              {mode === "ALL" ? (
                <>
                  <Link
                    href={makeHref({ nextPeriod: null, nextPage: 1 })}
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
                      href={makeHref({ nextPeriod: day, nextPage: 1 })}
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
          <div className="flex flex-wrap items-center gap-1.5 py-2 sm:gap-2">
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
