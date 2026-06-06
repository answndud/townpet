import { describe, expect, it } from "vitest";

import {
  buildDbReadinessHeaderTargets,
  filterDbReadinessHeaderTargets,
  hasIndexSignal,
  parseDbReadinessTargetFilter,
  parseVercelIdRegions,
  summarizeDatabaseUrl,
} from "./measure-db-readiness";

describe("measure-db-readiness helpers", () => {
  it("summarizes database URLs without credentials", () => {
    const summary = summarizeDatabaseUrl(
      "postgresql://townpet:secret@ep-test-pooler.ap-northeast-2.aws.neon.tech/townpet?sslmode=require",
    );

    expect(summary).toMatchObject({
      configured: true,
      protocol: "postgresql",
      host: "ep-test-pooler.ap-northeast-2.aws.neon.tech",
      database: "townpet",
      usesPoolingHost: true,
    });
    expect(JSON.stringify(summary)).not.toContain("secret");
  });

  it("handles missing database URLs", () => {
    expect(summarizeDatabaseUrl(undefined)).toMatchObject({
      configured: false,
      host: null,
      usesPoolingHost: false,
    });
  });

  it("parses Vercel region path hints", () => {
    expect(parseVercelIdRegions("icn1::sin1::k5jrl-1779332611413-4e5049ecb9ea")).toEqual([
      "icn1",
      "sin1",
      "k5jrl",
    ]);
  });

  it("checks schema and migration index signals", () => {
    expect(hasIndexSignal('CREATE INDEX "Post_title_trgm_idx"', "Post_title_trgm_idx")).toBe(true);
    expect(hasIndexSignal('@@index([scope, status, createdAt(sort: Desc)])', "missing_idx")).toBe(false);
  });

  it("keeps default header targets when PERF_DB_TARGETS is empty", () => {
    expect(buildDbReadinessHeaderTargets({}).map((target) => target.label)).toEqual([
      "home",
      "guest_feed_page",
      "guest_feed_api",
      "health",
    ]);
  });

  it("selects only requested header targets", () => {
    expect(
      buildDbReadinessHeaderTargets({
        PERF_DB_TARGETS: "guest_feed_api,health",
      }),
    ).toEqual([
      {
        label: "guest_feed_api",
        path: "/api/feed/guest?mode=ALL&sort=LATEST&page=1",
      },
      {
        label: "health",
        path: "/api/health",
      },
    ]);
  });

  it("deduplicates comma-separated DB readiness target labels while preserving order", () => {
    expect(parseDbReadinessTargetFilter("health, guest_feed_api,health")).toEqual([
      "health",
      "guest_feed_api",
    ]);
  });

  it("rejects unknown DB readiness target labels", () => {
    expect(() =>
      filterDbReadinessHeaderTargets([{ label: "home", path: "/" }], "home,missing"),
    ).toThrow("PERF_DB_TARGETS contains unknown target(s): missing");
  });
});
