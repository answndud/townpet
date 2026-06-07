import { describe, expect, it } from "vitest";

import { formatAuthAuditCleanupOutput } from "./cleanup-auth-audits";

describe("auth audit cleanup CLI output", () => {
  it("explains dry-run cleanup without implying rows were deleted", () => {
    expect(
      formatAuthAuditCleanupOutput({
        mode: "dry-run",
        count: 4,
        cutoff: new Date("2026-01-01T00:00:00.000Z"),
        retentionDays: 180,
      }),
    ).toBe(
      [
        "Would delete 4 auth audit logs older than 180 days (cutoff: 2026-01-01T00:00:00.000Z, mode: dry-run).",
        "Dry-run mode. Re-run with --apply to delete rows.",
      ].join("\n"),
    );
  });

  it("formats apply cleanup as a completed deletion", () => {
    expect(
      formatAuthAuditCleanupOutput({
        mode: "apply",
        count: 2,
        cutoff: new Date("2026-01-01T00:00:00.000Z"),
        retentionDays: 180,
      }),
    ).toBe(
      "Deleted 2 auth audit logs older than 180 days (cutoff: 2026-01-01T00:00:00.000Z, mode: apply).",
    );
  });
});
