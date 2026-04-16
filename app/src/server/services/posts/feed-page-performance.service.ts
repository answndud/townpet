import { logger } from "@/server/logger";

const DEFAULT_SLOW_FEED_PAGE_MS = 400;

type FeedPagePerfContext = {
  route: string;
  mode: string;
  page: number;
  resolvedPage?: number;
  totalPages?: number;
  itemCount?: number;
  isAuthenticated: boolean;
  isGuestTypeBlocked: boolean;
  feedScope: string;
  personalized: boolean;
  requestedType: string | null;
  reviewBoard: boolean;
};

export function createFeedPagePerformanceTracker({
  forceLog,
  slowThresholdMs = DEFAULT_SLOW_FEED_PAGE_MS,
}: {
  forceLog: boolean;
  slowThresholdMs?: number;
}) {
  const startedAt = Date.now();
  const phases: Record<string, number> = {};

  return {
    async measure<T>(phase: string, task: () => Promise<T>) {
      const phaseStartedAt = Date.now();
      try {
        return await task();
      } finally {
        phases[phase] = Date.now() - phaseStartedAt;
      }
    },
    flush(context: FeedPagePerfContext) {
      const totalMs = Date.now() - startedAt;
      if (!forceLog && totalMs < slowThresholdMs) {
        return { logged: false, totalMs, phases };
      }

      const payload = {
        ...context,
        totalMs,
        slowThresholdMs,
        phases,
      };

      if (forceLog) {
        logger.info("feed_page_timing", payload);
      } else {
        logger.warn("feed_page_timing", payload);
      }

      return { logged: true, totalMs, phases };
    },
  };
}
