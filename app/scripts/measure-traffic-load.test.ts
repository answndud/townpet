import { describe, expect, it } from "vitest";

import {
  buildDefaultTrafficTargets,
  buildTrafficRunConfig,
  filterTrafficTargets,
  parseTrafficProfile,
  percentile,
  selectWeightedTarget,
  summarizeTraffic,
  type TrafficSample,
} from "./measure-traffic-load";

function sample(
  overrides: Partial<TrafficSample> & Pick<TrafficSample, "targetLabel" | "durationMs" | "status">,
): TrafficSample {
  return {
    phase: overrides.phase ?? "load",
    targetLabel: overrides.targetLabel,
    path: overrides.path ?? "/",
    requestIndex: overrides.requestIndex ?? 1,
    workerIndex: overrides.workerIndex ?? 1,
    status: overrides.status,
    ok: overrides.ok ?? (overrides.status >= 200 && overrides.status < 400),
    durationMs: overrides.durationMs,
    headerMs: overrides.headerMs ?? overrides.durationMs,
    bytes: overrides.bytes ?? 100,
    error: overrides.error ?? "",
    vercelCache: overrides.vercelCache ?? "",
    vercelId: overrides.vercelId ?? "",
  };
}

describe("measure-traffic-load helpers", () => {
  it("calculates nearest-rank percentiles", () => {
    expect(percentile([10, 20, 30, 40], 50)).toBe(20);
    expect(percentile([10, 20, 30, 40], 95)).toBe(40);
    expect(percentile([], 95)).toBe(0);
  });

  it("filters traffic targets by label and rejects unknown labels", () => {
    const targets = buildDefaultTrafficTargets();

    expect(filterTrafficTargets(targets, "home,health").map((target) => target.label)).toEqual([
      "home",
      "health",
    ]);
    expect(() => filterTrafficTargets(targets, "missing")).toThrow(/unknown target/);
  });

  it("parses traffic profiles and rejects unknown profile names", () => {
    expect(parseTrafficProfile(undefined)).toBe("smoke");
    expect(parseTrafficProfile("baseline")).toBe("baseline");
    expect(parseTrafficProfile("SPIKE")).toBe("spike");
    expect(() => parseTrafficProfile("burst")).toThrow(/PERF_TRAFFIC_PROFILE/);
  });

  it("applies profile defaults before env overrides", () => {
    expect(
      buildTrafficRunConfig({
        PERF_TRAFFIC_PROFILE: "baseline",
      }),
    ).toMatchObject({
      profile: "baseline",
      durationMs: 60_000,
      concurrency: 8,
      maxRequests: 1_200,
      warmupPerTarget: 2,
    });

    expect(
      buildTrafficRunConfig({
        PERF_TRAFFIC_PROFILE: "baseline",
        PERF_TRAFFIC_CONCURRENCY: "3",
      }).concurrency,
    ).toBe(3);
  });

  it("selects targets by cumulative weight", () => {
    const targets = [
      { label: "a", path: "/a", method: "GET" as const, weight: 1, maxP95Ms: 1, maxP99Ms: 1, maxErrorRate: 0 },
      { label: "b", path: "/b", method: "GET" as const, weight: 3, maxP95Ms: 1, maxP99Ms: 1, maxErrorRate: 0 },
    ];

    expect(selectWeightedTarget(targets, 0).label).toBe("a");
    expect(selectWeightedTarget(targets, 0.3).label).toBe("b");
  });

  it("summarizes latency and fails goals when p95 or error rate exceeds target", () => {
    const targets = [
      {
        label: "home",
        path: "/",
        method: "GET" as const,
        weight: 1,
        maxP95Ms: 100,
        maxP99Ms: 200,
        maxErrorRate: 0,
      },
    ];
    const summaries = summarizeTraffic(
      [
        sample({ targetLabel: "home", status: 200, durationMs: 50 }),
        sample({ targetLabel: "home", status: 200, durationMs: 120 }),
        sample({ targetLabel: "home", status: 500, durationMs: 180, ok: false }),
      ],
      targets,
      1_000,
    );

    expect(summaries[0]).toMatchObject({
      label: "home",
      requests: 3,
      success: 2,
      failed: 1,
      goalStatus: "FAIL",
    });
    expect(summaries[0]?.goalReasons.join(" ")).toContain("p95=");
    expect(summaries[0]?.goalReasons.join(" ")).toContain("error_rate=");
  });

  it("summarizes header and body latency separately", () => {
    const targets = [
      {
        label: "home",
        path: "/",
        method: "GET" as const,
        weight: 1,
        maxP95Ms: 500,
        maxP99Ms: 500,
        maxErrorRate: 0,
      },
    ];

    const [summary] = summarizeTraffic(
      [
        sample({ targetLabel: "home", status: 200, durationMs: 100, headerMs: 20 }),
        sample({ targetLabel: "home", status: 200, durationMs: 200, headerMs: 150 }),
        sample({ targetLabel: "home", status: 200, durationMs: 300, headerMs: 260 }),
      ],
      targets,
      1_000,
    );

    expect(summary).toMatchObject({
      headerP50Ms: 150,
      headerP95Ms: 260,
      headerP99Ms: 260,
      bodyP50Ms: 50,
      bodyP95Ms: 80,
      bodyP99Ms: 80,
    });
  });

  it("guards heavy remote runs unless explicitly acknowledged", () => {
    expect(() =>
      buildTrafficRunConfig({
        PERF_TRAFFIC_BASE_URL: "https://townpet.vercel.app",
        PERF_TRAFFIC_CONCURRENCY: "8",
      }),
    ).toThrow(/Remote traffic run/);

    expect(
      buildTrafficRunConfig({
        PERF_TRAFFIC_BASE_URL: "https://townpet.vercel.app",
        PERF_TRAFFIC_CONCURRENCY: "8",
        PERF_TRAFFIC_REMOTE_ACK: "I_UNDERSTAND",
      }).concurrency,
    ).toBe(8);
  });

  it("requires a second acknowledgement for remote stress, spike, and soak profiles", () => {
    expect(() =>
      buildTrafficRunConfig({
        PERF_TRAFFIC_BASE_URL: "https://townpet.vercel.app",
        PERF_TRAFFIC_PROFILE: "stress",
        PERF_TRAFFIC_REMOTE_ACK: "I_UNDERSTAND",
      }),
    ).toThrow(/Remote stress traffic run/);

    expect(
      buildTrafficRunConfig({
        PERF_TRAFFIC_BASE_URL: "https://townpet.vercel.app",
        PERF_TRAFFIC_PROFILE: "stress",
        PERF_TRAFFIC_REMOTE_ACK: "I_UNDERSTAND",
        PERF_TRAFFIC_ALLOW_HEAVY_REMOTE: "1",
      }),
    ).toMatchObject({
      profile: "stress",
      concurrency: 30,
      maxRequests: 10_000,
    });
  });
});
