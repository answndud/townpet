import { describe, expect, it } from "vitest";

import { buildLatencySnapshotEndpoints } from "@/../scripts/collect-latency-snapshot";

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
});
