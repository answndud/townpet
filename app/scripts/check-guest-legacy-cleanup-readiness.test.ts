import { describe, expect, it } from "vitest";

import {
  hasAnyGuestLegacyColumn,
  normalizeGuestLegacyLookbackHours,
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
});
