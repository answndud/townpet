import { prisma } from "@/lib/prisma";
import { logger } from "@/server/logger";

type SearchTermStatDelegate = {
  upsert(args: Record<string, unknown>): Promise<unknown>;
};

type SearchTermDailyMetricDelegate = {
  upsert(args: Record<string, unknown>): Promise<unknown>;
};

let missingSearchTermStatDelegateWarned = false;
let missingSearchTermStatTableWarned = false;
let missingSearchTermDailyMetricDelegateWarned = false;
let missingSearchTermDailyMetricTableWarned = false;

export function getSearchTermStatWriteDelegate() {
  const delegate = (prisma as unknown as { searchTermStat?: SearchTermStatDelegate }).searchTermStat;
  if (!delegate && !missingSearchTermStatDelegateWarned) {
    missingSearchTermStatDelegateWarned = true;
    logger.warn("Prisma Client에 SearchTermStat 모델이 없어 검색 통계를 기록할 수 없습니다.");
  }
  return delegate ?? null;
}

export function getSearchTermDailyMetricWriteDelegate() {
  const delegate = (
    prisma as unknown as { searchTermDailyMetric?: SearchTermDailyMetricDelegate }
  ).searchTermDailyMetric;
  if (!delegate && !missingSearchTermDailyMetricDelegateWarned) {
    missingSearchTermDailyMetricDelegateWarned = true;
    logger.warn("Prisma Client에 SearchTermDailyMetric 모델이 없어 검색 일일 통계를 기록할 수 없습니다.");
  }
  return delegate ?? null;
}

export function isSearchTermStatSchemaSyncError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    ((error as { code?: string }).code === "P2021" ||
      (error as { code?: string }).code === "P2022")
  );
}

export function warnMissingSearchTermStatTable(error: unknown) {
  if (missingSearchTermStatTableWarned) return;
  missingSearchTermStatTableWarned = true;
  logger.warn("SearchTermStat 테이블/컬럼이 없어 검색 통계를 기록할 수 없습니다.", {
    error: error instanceof Error ? error.message : String(error),
  });
}

export function warnMissingSearchTermDailyMetricTable(error: unknown) {
  if (missingSearchTermDailyMetricTableWarned) return;
  missingSearchTermDailyMetricTableWarned = true;
  logger.warn("SearchTermDailyMetric 테이블/컬럼이 없어 검색 일일 통계를 기록할 수 없습니다.", {
    error: error instanceof Error ? error.message : String(error),
  });
}
