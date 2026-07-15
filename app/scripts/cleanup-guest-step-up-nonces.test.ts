import { describe, expect, it, vi } from "vitest";

import {
  formatGuestStepUpNonceCleanupOutput,
  runGuestStepUpNonceCleanup,
} from "./cleanup-guest-step-up-nonces";

describe("guest step-up nonce cleanup", () => {
  it("uses dry-run by default and counts expired rows", async () => {
    const count = vi.fn().mockResolvedValue(3);
    const deleteMany = vi.fn();
    const output = await runGuestStepUpNonceCleanup(
      { count, deleteMany },
      new Date("2026-07-31T00:00:00.000Z"),
    );

    expect(output).toContain("Would delete 3 expired guest step-up nonces");
    expect(count).toHaveBeenCalledOnce();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("deletes only when apply mode is explicit", async () => {
    vi.stubEnv("GUEST_STEP_UP_NONCE_CLEANUP_APPLY", "1");
    const deleteMany = vi.fn().mockResolvedValue({ count: 4 });
    const output = await runGuestStepUpNonceCleanup(
      { count: vi.fn(), deleteMany },
      new Date("2026-07-31T00:00:00.000Z"),
    );

    expect(output).toContain("Deleted 4 expired guest step-up nonces");
    expect(deleteMany).toHaveBeenCalledOnce();
    vi.unstubAllEnvs();
  });

  it("formats dry-run guidance", () => {
    expect(
      formatGuestStepUpNonceCleanupOutput({
        mode: "dry-run",
        count: 0,
        cutoff: new Date("2026-07-31T00:00:00.000Z"),
      }),
    ).toContain("Re-run with --apply");
  });
});
