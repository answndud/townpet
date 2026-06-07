import { describe, expect, it } from "vitest";

import {
  EXPECTED_ROLLBACK_ERROR,
  runGuestLegacyCleanupRehearsal,
} from "./rehearse-guest-legacy-cleanup";

const allLegacyColumns = [
  "guestDisplayName",
  "guestIpDisplay",
  "guestIpLabel",
  "guestPasswordHash",
  "guestIpHash",
  "guestFingerprintHash",
].map((column_name) => ({ column_name }));

function createFakePrisma(queryResults: unknown[][], transactionMode: "rollback" | "no-rollback" = "rollback") {
  let callIndex = 0;
  return {
    $queryRawUnsafe: async <T = unknown>() => (queryResults[callIndex++] ?? []) as T,
    $transaction: async (callback: (tx: { $executeRawUnsafe(query: string): Promise<unknown> }) => Promise<unknown>) => {
      if (transactionMode === "no-rollback") {
        return undefined;
      }
      return callback({
        $executeRawUnsafe: async () => undefined,
      });
    },
    $disconnect: async () => {},
  };
}

describe("guest legacy cleanup rehearsal", () => {
  it("fails before rehearsal when guest author backfill is incomplete", async () => {
    const result = await runGuestLegacyCleanupRehearsal(
      createFakePrisma([
        [{ exists: true }],
        [{ exists: true }],
        [{ count: 2 }],
        [{ count: 1 }],
      ]),
    );

    expect(result).toEqual({
      ok: false,
      reason: "BACKFILL_INCOMPLETE",
      postRemaining: 2,
      commentRemaining: 1,
      shouldExitFailure: true,
    });
  });

  it("skips safely when legacy columns are already dropped", async () => {
    const result = await runGuestLegacyCleanupRehearsal(
      createFakePrisma([
        [{ exists: false }],
        [{ exists: false }],
        [],
        [],
      ]),
    );

    expect(result).toEqual({
      ok: true,
      rehearsal: "drop-legacy-guest-columns",
      rollback: true,
      skipped: "LEGACY_COLUMNS_ALREADY_DROPPED",
      shouldExitFailure: false,
    });
  });

  it("passes only when the rollback sentinel is thrown", async () => {
    const result = await runGuestLegacyCleanupRehearsal(
      createFakePrisma([
        [{ exists: true }],
        [{ exists: true }],
        [{ count: 0 }],
        [{ count: 0 }],
        allLegacyColumns,
        allLegacyColumns,
      ]),
    );

    expect(result).toEqual({
      ok: true,
      rehearsal: "drop-legacy-guest-columns",
      rollback: true,
      shouldExitFailure: false,
    });
  });

  it("fails if the rollback transaction returns without the sentinel", async () => {
    const result = await runGuestLegacyCleanupRehearsal(
      createFakePrisma(
        [
          [{ exists: true }],
          [{ exists: true }],
          [{ count: 0 }],
          [{ count: 0 }],
          allLegacyColumns,
          allLegacyColumns,
        ],
        "no-rollback",
      ),
    );

    expect(result).toEqual({
      ok: false,
      reason: "REHEARSAL_DID_NOT_ROLLBACK",
      shouldExitFailure: true,
    });
  });

  it("uses a stable rollback sentinel", () => {
    expect(EXPECTED_ROLLBACK_ERROR).toBe("GUEST_LEGACY_CLEANUP_REHEARSAL_ROLLBACK");
  });
});
