import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { logger } from "@/server/logger";
import { createFeedPagePerformanceTracker } from "@/server/services/posts/feed-page-performance.service";

describe("createFeedPagePerformanceTracker", () => {
  it("skips logging when the request is below the slow threshold", async () => {
    const tracker = createFeedPagePerformanceTracker({
      forceLog: false,
      slowThresholdMs: 1_000,
    });

    await tracker.measure("bootstrap", async () => undefined);
    const result = tracker.flush({
      route: "/feed",
      mode: "ALL",
      page: 1,
      isAuthenticated: false,
      isGuestTypeBlocked: false,
      feedScope: "GLOBAL",
      personalized: false,
      requestedType: null,
      reviewBoard: false,
    });

    expect(result.logged).toBe(false);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("logs slow requests with warn and forced requests with info", async () => {
    const slowTracker = createFeedPagePerformanceTracker({
      forceLog: false,
      slowThresholdMs: 0,
    });

    await slowTracker.measure("pageQuery", async () => undefined);
    const slowResult = slowTracker.flush({
      route: "/feed",
      mode: "ALL",
      page: 1,
      resolvedPage: 1,
      totalPages: 3,
      itemCount: 20,
      isAuthenticated: true,
      isGuestTypeBlocked: false,
      feedScope: "GLOBAL",
      personalized: true,
      requestedType: "FREE",
      reviewBoard: false,
    });

    expect(slowResult.logged).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(
      "feed_page_timing",
      expect.objectContaining({
        route: "/feed",
        phases: expect.objectContaining({
          pageQuery: expect.any(Number),
        }),
      }),
    );

    const forcedTracker = createFeedPagePerformanceTracker({
      forceLog: true,
      slowThresholdMs: 1_000,
    });

    await forcedTracker.measure("personalization", async () => undefined);
    forcedTracker.flush({
      route: "/feed",
      mode: "BEST",
      page: 2,
      resolvedPage: 2,
      totalPages: 4,
      itemCount: 10,
      isAuthenticated: false,
      isGuestTypeBlocked: false,
      feedScope: "GLOBAL",
      personalized: false,
      requestedType: null,
      reviewBoard: true,
    });

    expect(logger.info).toHaveBeenCalledWith(
      "feed_page_timing",
      expect.objectContaining({
        route: "/feed",
        mode: "BEST",
        phases: expect.objectContaining({
          personalization: expect.any(Number),
        }),
      }),
    );
  });
});
