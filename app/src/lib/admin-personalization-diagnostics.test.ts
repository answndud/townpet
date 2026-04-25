import { describe, expect, it } from "vitest";

import { buildPersonalizationDiagnostics } from "@/lib/admin-personalization-diagnostics";
import type { FeedPersonalizationOverview } from "@/server/queries/feed-personalization-metrics.queries";

function buildOverview(
  overrides: Partial<FeedPersonalizationOverview> = {},
): FeedPersonalizationOverview {
  return {
    days: 14,
    totals: {
      viewCount: 600,
      postClickCount: 24,
      postCtr: 0.04,
      adImpressionCount: 900,
      adClickCount: 9,
      adCtr: 0.01,
    },
    surfaceSummaries: [],
    sourceSummaries: [],
    dailySummaries: [],
    topAudienceSummaries: [
      {
        audienceKey: "MALTESE",
        breedCode: "MALTESE",
        viewCount: 180,
        postClickCount: 10,
        postCtr: 10 / 180,
        adImpressionCount: 300,
        adClickCount: 3,
        adCtr: 0.01,
      },
      {
        audienceKey: "POODLE",
        breedCode: "POODLE",
        viewCount: 120,
        postClickCount: 8,
        postCtr: 8 / 120,
        adImpressionCount: 160,
        adClickCount: 2,
        adCtr: 0.0125,
      },
    ],
    ...overrides,
  };
}

describe("admin personalization diagnostics", () => {
  it("marks a complete and healthy overview as normal", () => {
    const diagnostics = buildPersonalizationDiagnostics(buildOverview());

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "data", level: "normal" }),
        expect.objectContaining({ id: "postCtr", level: "normal" }),
        expect.objectContaining({ id: "adCtr", level: "normal" }),
        expect.objectContaining({ id: "audience", level: "normal" }),
      ]),
    );
  });

  it("separates zero-data from policy tuning", () => {
    const diagnostics = buildPersonalizationDiagnostics(
      buildOverview({
        totals: {
          viewCount: 0,
          postClickCount: 0,
          postCtr: 0,
          adImpressionCount: 0,
          adClickCount: 0,
          adCtr: 0,
        },
        topAudienceSummaries: [],
      }),
    );

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "data",
          level: "action",
          href: "/admin/ops",
        }),
        expect.objectContaining({
          id: "postCtr",
          level: "pending",
          href: "/admin/personalization?days=30",
        }),
      ]),
    );
  });

  it("flags low feed CTR after the minimum sample size", () => {
    const diagnostics = buildPersonalizationDiagnostics(
      buildOverview({
        totals: {
          viewCount: 250,
          postClickCount: 2,
          postCtr: 2 / 250,
          adImpressionCount: 900,
          adClickCount: 9,
          adCtr: 0.01,
        },
      }),
    );

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        id: "postCtr",
        level: "action",
        href: "/admin/ops",
      }),
    );
  });

  it("flags suspicious ad CTR without sending operators to ranking changes", () => {
    const diagnostics = buildPersonalizationDiagnostics(
      buildOverview({
        totals: {
          viewCount: 600,
          postClickCount: 24,
          postCtr: 0.04,
          adImpressionCount: 1_000,
          adClickCount: 50,
          adCtr: 0.05,
        },
      }),
    );

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        id: "adCtr",
        level: "action",
        href: "/admin/policies",
      }),
    );
  });

  it("flags top audience concentration above the action threshold", () => {
    const diagnostics = buildPersonalizationDiagnostics(
      buildOverview({
        totals: {
          viewCount: 200,
          postClickCount: 10,
          postCtr: 0.05,
          adImpressionCount: 700,
          adClickCount: 7,
          adCtr: 0.01,
        },
        topAudienceSummaries: [
          {
            audienceKey: "MALTESE",
            breedCode: "MALTESE",
            viewCount: 120,
            postClickCount: 8,
            postCtr: 8 / 120,
            adImpressionCount: 320,
            adClickCount: 3,
            adCtr: 3 / 320,
          },
        ],
      }),
    );

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        id: "audience",
        level: "action",
        href: "/admin/breeds",
      }),
    );
  });
});
