import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildCareSmokeReadiness,
  CARE_SMOKE_DEFAULTS,
  formatCareSmokeReadiness,
  main,
  runCareSmokeReadinessCli,
} from "./check-care-smoke-readiness";

describe("care smoke readiness", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks production smoke when the internal health token is missing", () => {
    const result = buildCareSmokeReadiness({});

    expect(result.status).toBe("BLOCKED");
    expect(result.baseUrl).toBe(CARE_SMOKE_DEFAULTS.baseUrl);
    expect(result.smokeAccounts).toEqual({
      adminEmail: CARE_SMOKE_DEFAULTS.adminEmail,
      requesterEmail: CARE_SMOKE_DEFAULTS.requesterEmail,
      caregiverEmail: CARE_SMOKE_DEFAULTS.caregiverEmail,
      usingDefaults: true,
    });
    expect(result.checks).toContainEqual({
      key: "INTERNAL_HEALTH_TOKEN",
      status: "BLOCKED",
      detail: "OPS_HEALTH_INTERNAL_TOKEN 또는 HEALTH_INTERNAL_TOKEN 필요",
    });
  });

  it("passes required readiness while keeping Sentry optional", () => {
    const result = buildCareSmokeReadiness({
      OPS_BASE_URL: "https://townpet.vercel.app",
      OPS_HEALTH_INTERNAL_TOKEN: "token",
      CARE_SMOKE_ADMIN_EMAIL: "admin@example.test",
      CARE_SMOKE_REQUESTER_EMAIL: "requester@example.test",
      CARE_SMOKE_CAREGIVER_EMAIL: "caregiver@example.test",
    });

    expect(result.status).toBe("PASS");
    expect(result.smokeAccounts.usingDefaults).toBe(false);
    expect(result.checks).toContainEqual({
      key: "SENTRY_SMOKE",
      status: "WARN",
      detail: "Sentry smoke는 선택 항목. 실행하려면 Sentry secret 4종 필요",
    });
  });

  it("formats readiness without exposing token values", () => {
    const output = formatCareSmokeReadiness(
      buildCareSmokeReadiness({
        OPS_HEALTH_INTERNAL_TOKEN: "secret-token-value",
      }),
    );

    expect(output).toContain("INTERNAL_HEALTH_TOKEN: PASS (설정됨)");
    expect(output).not.toContain("secret-token-value");
  });

  it("returns blocked exit code from the testable CLI runner", () => {
    const cliResult = runCareSmokeReadinessCli({});

    expect(cliResult.exitCode).toBe(1);
    expect(cliResult.result.status).toBe("BLOCKED");
    expect(cliResult.output).toContain("status: BLOCKED");
  });

  it("returns pass exit code from the testable CLI runner", () => {
    const cliResult = runCareSmokeReadinessCli({
      OPS_HEALTH_INTERNAL_TOKEN: "token",
      CARE_SMOKE_ADMIN_EMAIL: "admin@example.test",
      CARE_SMOKE_REQUESTER_EMAIL: "requester@example.test",
      CARE_SMOKE_CAREGIVER_EMAIL: "caregiver@example.test",
    });

    expect(cliResult.exitCode).toBe(0);
    expect(cliResult.output).toContain("status: PASS");
  });

  it("prints CLI output through main on pass", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const output = main({
      OPS_HEALTH_INTERNAL_TOKEN: "token",
      CARE_SMOKE_ADMIN_EMAIL: "admin@example.test",
      CARE_SMOKE_REQUESTER_EMAIL: "requester@example.test",
      CARE_SMOKE_CAREGIVER_EMAIL: "caregiver@example.test",
    });

    expect(output).toContain("Care smoke readiness");
    expect(log).toHaveBeenCalledWith(output);
  });
});
