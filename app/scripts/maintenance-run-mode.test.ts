import { describe, expect, it } from "vitest";

import { resolveMaintenanceRunMode } from "./maintenance-run-mode";

describe("maintenance run mode", () => {
  it("defaults to dry-run", () => {
    expect(resolveMaintenanceRunMode({ argv: [], env: {} })).toBe("dry-run");
  });

  it("uses --apply when explicitly requested", () => {
    expect(resolveMaintenanceRunMode({ argv: ["--apply"], env: {} })).toBe("apply");
  });

  it("uses --dry-run when explicitly requested", () => {
    expect(resolveMaintenanceRunMode({ argv: ["--dry-run"], env: {} })).toBe("dry-run");
  });

  it("supports script-specific apply env flags", () => {
    expect(
      resolveMaintenanceRunMode({
        argv: [],
        env: { CLEANUP_APPLY: "1" },
        applyEnvName: "CLEANUP_APPLY",
      }),
    ).toBe("apply");
  });

  it("supports legacy dry-run env flags", () => {
    expect(
      resolveMaintenanceRunMode({
        argv: [],
        env: { LEGACY_DRY_RUN: "1" },
        dryRunEnvName: "LEGACY_DRY_RUN",
        defaultMode: "apply",
      }),
    ).toBe("dry-run");
  });

  it("rejects conflicting mode inputs", () => {
    expect(() =>
      resolveMaintenanceRunMode({
        argv: ["--apply"],
        env: { LEGACY_DRY_RUN: "1" },
        dryRunEnvName: "LEGACY_DRY_RUN",
      }),
    ).toThrow("Choose only one maintenance mode");
  });
});
