import { describe, expect, it } from "vitest";

import {
  buildApiTimingTargets,
  filterApiTimingTargets,
  parseApiTimingTargetFilter,
} from "./measure-api-route-timings";

describe("API route timing target selection", () => {
  it("keeps default API timing targets when PERF_API_TIMING_TARGETS is empty", () => {
    const targets = buildApiTimingTargets({});

    expect(targets.map((target) => target.label)).toEqual([
      "health",
      "home_feed",
      "guest_feed",
    ]);
  });

  it("selects only requested API timing targets", () => {
    const targets = buildApiTimingTargets({
      PERF_API_TIMING_TARGETS: "guest_feed",
    });

    expect(targets).toEqual([
      {
        label: "guest_feed",
        path: "/api/feed/guest?perf=1",
      },
    ]);
  });

  it("deduplicates comma-separated API timing target labels while preserving order", () => {
    expect(parseApiTimingTargetFilter("guest_feed, health,guest_feed")).toEqual([
      "guest_feed",
      "health",
    ]);
  });

  it("rejects unknown API timing target labels", () => {
    expect(() =>
      filterApiTimingTargets(
        [{ label: "health", path: "/api/health?perf=1" }],
        "health,missing",
      ),
    ).toThrow("PERF_API_TIMING_TARGETS contains unknown target(s): missing");
  });
});
