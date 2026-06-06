import { describe, expect, it } from "vitest";

import {
  buildMeasurementTargets,
  filterMeasurementTargets,
  parseTargetFilter,
} from "./measure-production-performance";

describe("production performance target selection", () => {
  it("keeps all default targets when PERF_TARGETS is empty", () => {
    const targets = buildMeasurementTargets({});

    expect(targets.map((target) => target.label)).toContain("home");
    expect(targets.map((target) => target.label)).toContain("guest_feed");
    expect(targets.some((target) => target.label === "post_detail")).toBe(false);
  });

  it("adds and selects public post detail when PERF_POST_PATH and PERF_TARGETS are set", () => {
    const targets = buildMeasurementTargets({
      PERF_POST_PATH: "/posts/post-1/guest",
      PERF_TARGETS: "post_detail",
    });

    expect(targets).toEqual([
      {
        label: "post_detail",
        path: "/posts/post-1/guest",
        method: "GET",
      },
    ]);
  });

  it("deduplicates comma-separated target labels while preserving order", () => {
    expect(parseTargetFilter("guest_feed, post_detail,guest_feed")).toEqual([
      "guest_feed",
      "post_detail",
    ]);
  });

  it("rejects unknown target labels", () => {
    expect(() =>
      filterMeasurementTargets(
        [{ label: "home", path: "/", method: "GET" }],
        "home,missing",
      ),
    ).toThrow("PERF_TARGETS contains unknown target(s): missing");
  });
});
