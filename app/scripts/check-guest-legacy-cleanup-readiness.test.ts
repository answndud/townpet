import { describe, expect, it } from "vitest";

import {
  hasAnyGuestLegacyColumn,
  normalizeGuestLegacyLookbackHours,
  resolveGuestLegacyCleanupConfig,
  runGuestLegacyCleanupReadiness,
  selectKnownGuestLegacyColumns,
} from "./check-guest-legacy-cleanup-readiness";

function createFakePrisma(queryResults: unknown[][]) {
  let callIndex = 0;
  return {
    $queryRawUnsafe: async <T = unknown>() => (queryResults[callIndex++] ?? []) as T,
    $disconnect: async () => {},
  };
}

describe("guest legacy cleanup readiness helpers", () => {
  it("detects legacy guest columns even when guestPasswordHash has already been dropped", () => {
    expect(hasAnyGuestLegacyColumn(["guestDisplayName", "guestIpLabel"])).toBe(true);
    expect(selectKnownGuestLegacyColumns(["id", "guestDisplayName", "createdAt"])).toEqual([
      "guestDisplayName",
    ]);
  });

  it("does not treat unrelated columns as legacy guest cleanup blockers", () => {
    expect(hasAnyGuestLegacyColumn(["id", "authorId", "createdAt"])).toBe(false);
    expect(selectKnownGuestLegacyColumns(["id", "authorId", "createdAt"])).toEqual([]);
  });

  it("normalizes lookback hours to a safe positive capped range", () => {
    expect(normalizeGuestLegacyLookbackHours(undefined)).toBe(24);
    expect(normalizeGuestLegacyLookbackHours("0")).toBe(24);
    expect(normalizeGuestLegacyLookbackHours("12.8")).toBe(12);
    expect(normalizeGuestLegacyLookbackHours("9999")).toBe(24 * 30);
  });

  it("resolves strict and lookback settings from an explicit env map", () => {
    expect(
      resolveGuestLegacyCleanupConfig({
        GUEST_LEGACY_CLEANUP_STRICT: "1",
        GUEST_LEGACY_LOOKBACK_HOURS: "48",
      }),
    ).toEqual({
      strict: true,
      lookbackHours: 48,
    });

    expect(
      resolveGuestLegacyCleanupConfig({
        GUEST_LEGACY_CLEANUP_STRICT: "true",
        GUEST_LEGACY_LOOKBACK_HOURS: "bad",
      }),
    ).toEqual({
      strict: false,
      lookbackHours: 24,
    });
  });

  it("returns a skipped ok payload when legacy columns are already dropped", async () => {
    const result = await runGuestLegacyCleanupReadiness(
      createFakePrisma([[], []]),
      { strict: true, lookbackHours: 72 },
    );

    expect(result).toEqual({
      payload: {
        ok: true,
        strict: true,
        lookbackHours: 72,
        postLegacyOnly: 0,
        commentLegacyOnly: 0,
        recentPostLegacyCredentialWrites: 0,
        recentCommentLegacyCredentialWrites: 0,
        pendingBackfillPosts: 0,
        pendingBackfillComments: 0,
        legacyColumnsPresent: false,
        postLegacyColumns: [],
        commentLegacyColumns: [],
        skipped: "LEGACY_COLUMNS_ALREADY_DROPPED",
      },
      shouldExitFailure: false,
    });
  });

  it("marks strict readiness as failed when legacy rows remain", async () => {
    const result = await runGuestLegacyCleanupReadiness(
      createFakePrisma([
        [{ column_name: "guestPasswordHash" }],
        [{ column_name: "guestIpHash" }],
        [{ count: 2 }],
        [{ count: 0 }],
        [{ count: 1 }],
        [{ count: 0 }],
        [{ count: 2 }],
        [{ count: 0 }],
      ]),
      { strict: true, lookbackHours: 24 },
    );

    expect(result.shouldExitFailure).toBe(true);
    expect(result.payload).toMatchObject({
      ok: false,
      strict: true,
      legacyColumnsPresent: true,
      postLegacyOnly: 2,
      recentPostLegacyCredentialWrites: 1,
      pendingBackfillPosts: 2,
    });
  });
});
