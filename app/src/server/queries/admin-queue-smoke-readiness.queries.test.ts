import { describe, expect, it } from "vitest";

import { getAdminQueueSmokeReadiness } from "@/server/queries/admin-queue-smoke-readiness.queries";

describe("admin queue smoke readiness queries", () => {
  it("blocks without exposing credential values when required smoke credentials are missing", () => {
    expect(
      getAdminQueueSmokeReadiness({
        ADMIN_QUEUE_SMOKE_EMAIL: "",
        ADMIN_QUEUE_SMOKE_PASSWORD: undefined,
      }),
    ).toMatchObject({
      status: "BLOCKED",
      requiredKeys: ["ADMIN_QUEUE_SMOKE_EMAIL", "ADMIN_QUEUE_SMOKE_PASSWORD"],
      missingKeys: ["ADMIN_QUEUE_SMOKE_EMAIL", "ADMIN_QUEUE_SMOKE_PASSWORD"],
      configuredKeys: [],
    });
  });

  it("passes readiness when both smoke credentials are configured", () => {
    expect(
      getAdminQueueSmokeReadiness({
        ADMIN_QUEUE_SMOKE_EMAIL: "admin@example.com",
        ADMIN_QUEUE_SMOKE_PASSWORD: "secret",
      }),
    ).toMatchObject({
      status: "PASS",
      missingKeys: [],
      configuredKeys: ["ADMIN_QUEUE_SMOKE_EMAIL", "ADMIN_QUEUE_SMOKE_PASSWORD"],
    });
  });

  it("returns the documented production smoke command", () => {
    const readiness = getAdminQueueSmokeReadiness({});

    expect(readiness.command).toContain("OPS_BASE_URL=https://townpet.vercel.app");
    expect(readiness.command).toContain("ops:check:admin-queue-smoke");
    expect(readiness.docsPath).toContain("배포전_on-demand_체크.md");
  });
});
