import { describe, expect, it } from "vitest";

import {
  buildLatencySnapshotEndpoints,
  buildLatencySnapshotEndpointsFromEnv,
  filterLatencySnapshotEndpoints,
  parseLatencySnapshotTargetFilter,
} from "@/../scripts/collect-latency-snapshot";

describe("latency snapshot endpoints", () => {
  it("measures the canonical guest feed page instead of the redirecting feed route", () => {
    const endpoints = buildLatencySnapshotEndpoints({
      getSamples: 5,
      postSamples: 3,
      pauseMs: 100,
    });

    const pageFeed = endpoints.find((endpoint) => endpoint.label === "page_feed");

    expect(pageFeed?.path).toBe("/feed/guest");
    expect(pageFeed?.path).not.toBe("/feed");
  });

  it("selects only requested endpoints from OPS_PERF_TARGETS", () => {
    const endpoints = buildLatencySnapshotEndpointsFromEnv({
      OPS_PERF_GET_SAMPLES: "5",
      OPS_PERF_POST_SAMPLES: "3",
      OPS_PERF_PAUSE_MS: "100",
      OPS_PERF_TARGETS: "api_feed_guest,api_search_log",
    });

    expect(endpoints.map((endpoint) => endpoint.label)).toEqual([
      "api_feed_guest",
      "api_search_log",
    ]);
    expect(endpoints.find((endpoint) => endpoint.label === "api_feed_guest")?.samples).toBe(5);
    expect(endpoints.find((endpoint) => endpoint.label === "api_search_log")?.samples).toBe(3);
  });

  it("deduplicates comma-separated endpoint labels while preserving order", () => {
    expect(parseLatencySnapshotTargetFilter("api_feed_guest, page_feed,api_feed_guest")).toEqual([
      "api_feed_guest",
      "page_feed",
    ]);
  });

  it("rejects unknown latency endpoint labels", () => {
    expect(() =>
      filterLatencySnapshotEndpoints(
        [{ label: "page_feed", method: "GET", path: "/feed/guest", samples: 1, pauseMs: 0 }],
        "page_feed,missing",
      ),
    ).toThrow("OPS_PERF_TARGETS contains unknown target(s): missing");
  });
});
