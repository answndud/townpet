import { describe, expect, it } from "vitest";

import {
  formatGuestAuthorBackfillOutput,
  resolveGuestAuthorBackfillBatchSize,
  toGuestAuthorData,
} from "./backfill-guest-authors";

describe("guest author backfill CLI wrapper", () => {
  it("resolves batch size with fallback and max clamp", () => {
    expect(resolveGuestAuthorBackfillBatchSize(undefined)).toBe(200);
    expect(resolveGuestAuthorBackfillBatchSize("0")).toBe(200);
    expect(resolveGuestAuthorBackfillBatchSize("500")).toBe(500);
    expect(resolveGuestAuthorBackfillBatchSize("1200")).toBe(1000);
    expect(resolveGuestAuthorBackfillBatchSize("19.9")).toBe(19);
  });

  it("builds guest author data from complete legacy metadata", () => {
    expect(
      toGuestAuthorData({
        id: "post-1",
        guestDisplayName: "  guest  ",
        guestPasswordHash: "pw-hash",
        guestIpHash: "ip-hash",
        guestFingerprintHash: "fingerprint-hash",
        guestIpDisplay: "127.0.0.*",
        guestIpLabel: "local",
      }),
    ).toEqual({
      displayName: "guest",
      passwordHash: "pw-hash",
      ipHash: "ip-hash",
      fingerprintHash: "fingerprint-hash",
      ipDisplay: "127.0.0.*",
      ipLabel: "local",
    });
  });

  it("returns null when required guest metadata is missing", () => {
    expect(
      toGuestAuthorData({
        id: "post-1",
        guestDisplayName: "guest",
        guestPasswordHash: null,
        guestIpHash: "ip-hash",
        guestFingerprintHash: null,
        guestIpDisplay: null,
        guestIpLabel: null,
      }),
    ).toBeNull();
  });

  it("formats legacy-column-dropped output", () => {
    expect(
      formatGuestAuthorBackfillOutput({
        batchSize: 200,
        dryRun: true,
        hasLegacyPostColumns: false,
        hasLegacyCommentColumns: false,
        posts: 0,
        comments: 0,
      }),
    ).toBe(
      [
        "Guest author backfill started (dryRun=yes, batchSize=200)",
        "Legacy guest columns already dropped. Backfill skipped.",
      ].join("\n"),
    );
  });

  it("formats dry-run output without implying rows were written", () => {
    expect(
      formatGuestAuthorBackfillOutput({
        batchSize: 200,
        dryRun: true,
        hasLegacyPostColumns: true,
        hasLegacyCommentColumns: true,
        posts: 3,
        comments: 2,
      }),
    ).toBe(
      [
        "Guest author backfill started (dryRun=yes, batchSize=200)",
        "Dry-run matched 3 posts and 2 comments for backfill.",
        "Re-run with --apply to write guestAuthorId backfill rows.",
      ].join("\n"),
    );
  });

  it("formats apply output as completed backfill", () => {
    expect(
      formatGuestAuthorBackfillOutput({
        batchSize: 200,
        dryRun: false,
        hasLegacyPostColumns: true,
        hasLegacyCommentColumns: true,
        posts: 3,
        comments: 2,
      }),
    ).toBe(
      [
        "Guest author backfill started (dryRun=no, batchSize=200)",
        "Backfilled guestAuthorId for 3 posts and 2 comments.",
      ].join("\n"),
    );
  });
});
