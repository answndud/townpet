import { describe, expect, it } from "vitest";

import {
  hasAnyGuestLegacyColumn,
  normalizeGuestLegacyLookbackHours,
  resolveGuestLegacyCleanupConfig,
  selectKnownGuestLegacyColumns,
} from "./check-guest-legacy-cleanup-readiness";

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
});
