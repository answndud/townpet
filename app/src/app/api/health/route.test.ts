import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/health/route";
import { validateRuntimeEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getQueryCacheHealth } from "@/server/cache/query-cache";
import { checkModerationControlPlaneHealth } from "@/server/moderation-control-plane";
import { getClientIp } from "@/server/request-context";
import { checkRateLimitHealth } from "@/server/rate-limit";

const { mockRuntimeEnv } = vi.hoisted(() => ({
  mockRuntimeEnv: {
    nodeEnv: "production",
    isProduction: true,
    healthInternalToken: "health-secret",
  },
}));

vi.mock("@/lib/env", () => ({
  runtimeEnv: mockRuntimeEnv,
  validateRuntimeEnv: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/server/rate-limit", () => ({
  checkRateLimitHealth: vi.fn(),
}));

vi.mock("@/server/request-context", () => ({
  getClientIp: vi.fn(),
}));

vi.mock("@/server/moderation-control-plane", () => ({
  checkModerationControlPlaneHealth: vi.fn(),
}));

vi.mock("@/server/cache/query-cache", () => ({
  getQueryCacheHealth: vi.fn(),
}));

vi.mock("@/server/logger", () => ({
  logger: {
    warn: vi.fn(),
  },
}));

const mockValidateRuntimeEnv = vi.mocked(validateRuntimeEnv);
const mockQueryRaw = vi.mocked(prisma.$queryRaw);
const mockCheckRateLimitHealth = vi.mocked(checkRateLimitHealth);
const mockCheckModerationControlPlaneHealth = vi.mocked(checkModerationControlPlaneHealth);
const mockGetQueryCacheHealth = vi.mocked(getQueryCacheHealth);
const mockGetClientIp = vi.mocked(getClientIp);

describe("GET /api/health", () => {
  beforeEach(() => {
    mockValidateRuntimeEnv.mockReset();
    mockQueryRaw.mockReset();
    mockCheckRateLimitHealth.mockReset();
    mockCheckModerationControlPlaneHealth.mockReset();
    mockGetClientIp.mockReset();

    mockRuntimeEnv.nodeEnv = "production";
    mockRuntimeEnv.isProduction = true;
    mockRuntimeEnv.healthInternalToken = "health-secret";
    mockValidateRuntimeEnv.mockReturnValue({ ok: false, missing: ["AUTH_SECRET"] });
    mockQueryRaw.mockRejectedValue(new Error("db down: secret detail"));
    mockCheckRateLimitHealth.mockResolvedValue({
      backend: "redis",
      status: "error",
      detail: "Redis ping 예외: boom",
    });
    mockCheckModerationControlPlaneHealth.mockResolvedValue({
      state: "error",
      checks: [
        {
          key: "notification",
          state: "error",
          message: "Notification 스키마가 누락되었습니다.",
        },
      ],
    });
    mockGetQueryCacheHealth.mockReturnValue({
      state: "ok",
      enabled: true,
      backend: "upstash",
      bypassActive: false,
      bypassRemainingMs: 0,
      bypassUntil: null,
      lastFailureAt: null,
      message: "distributed query cache healthy",
    });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("hides detailed diagnostics on public request", async () => {
    const request = new Request("http://localhost/api/health");

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.status).toBe("degraded");
    expect(payload.timestamp).toEqual(expect.any(String));
    expect(payload.env).toBeUndefined();
    expect(payload.checks).toBeUndefined();
    expect(payload.uptimeSec).toBeUndefined();
    expect(payload.durationMs).toBeUndefined();
  });

  it("includes detailed diagnostics with valid internal token", async () => {
    const request = new Request("http://localhost/api/health", {
      headers: {
        "x-health-token": "health-secret",
      },
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.env.missing).toEqual(["AUTH_SECRET"]);
    expect(payload.checks.database.message).toContain("db down");
    expect(payload.checks.rateLimit.detail).toContain("Redis ping 예외");
    expect(payload.checks.controlPlane).toEqual({
      state: "error",
      checks: [
        {
          key: "notification",
          state: "error",
          message: "Notification 스키마가 누락되었습니다.",
        },
      ],
    });
    expect(payload.checks.cache).toEqual({
      state: "ok",
      enabled: true,
      backend: "upstash",
      bypassActive: false,
      bypassRemainingMs: 0,
      bypassUntil: null,
      lastFailureAt: null,
      message: "distributed query cache healthy",
    });
  });

  it("includes detailed diagnostics on localhost without a token only in non-production", async () => {
    mockRuntimeEnv.nodeEnv = "development";
    mockRuntimeEnv.isProduction = false;
    mockRuntimeEnv.healthInternalToken = "";
    mockGetClientIp.mockReturnValue("anonymous");

    const request = new Request("http://localhost/api/health");

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.env.missing).toEqual(["AUTH_SECRET"]);
    expect(payload.checks.database.message).toContain("db down");
  });

  it("keeps non-local non-production requests on the public contract when no token is configured", async () => {
    mockRuntimeEnv.nodeEnv = "development";
    mockRuntimeEnv.isProduction = false;
    mockRuntimeEnv.healthInternalToken = "";
    mockGetClientIp.mockReturnValue("203.0.113.10");

    const request = new Request("https://preview.townpet.dev/api/health", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.checks).toBeUndefined();
    expect(payload.env).toBeUndefined();
  });

  it("reports pg_trgm warning in detailed diagnostics when extension is missing", async () => {
    mockValidateRuntimeEnv.mockReturnValue({ ok: true, missing: [] });
    mockQueryRaw.mockResolvedValueOnce([{} as never]).mockResolvedValueOnce([{ enabled: false }]);
    mockCheckRateLimitHealth.mockResolvedValue({
      backend: "redis",
      status: "ok",
      detail: "ok",
    });
    mockCheckModerationControlPlaneHealth.mockResolvedValue({
      state: "ok",
      checks: [
        {
          key: "notification",
          state: "ok",
          message: "notification ready",
        },
      ],
    });

    const request = new Request("http://localhost/api/health", {
      headers: {
        "x-health-token": "health-secret",
      },
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("ok");
    expect(payload.checks.controlPlane).toEqual({
      state: "ok",
      checks: [
        {
          key: "notification",
          state: "ok",
          message: "notification ready",
        },
      ],
    });
    expect(payload.checks.search.pgTrgm).toMatchObject({
      state: "warn",
      enabled: false,
    });
    expect(payload.checks.search.pgTrgm.message).toContain("pg_trgm extension missing");
  });

  it("reports query cache bypass warning in detailed diagnostics", async () => {
    mockValidateRuntimeEnv.mockReturnValue({ ok: true, missing: [] });
    mockQueryRaw.mockResolvedValueOnce([{} as never]).mockResolvedValueOnce([{ enabled: true }]);
    mockCheckRateLimitHealth.mockResolvedValue({
      backend: "redis",
      status: "ok",
      detail: "ok",
    });
    mockCheckModerationControlPlaneHealth.mockResolvedValue({
      state: "ok",
      checks: [
        {
          key: "notification",
          state: "ok",
          message: "notification ready",
        },
      ],
    });
    mockGetQueryCacheHealth.mockReturnValue({
      state: "warn",
      enabled: true,
      backend: "upstash",
      bypassActive: true,
      bypassRemainingMs: 4321,
      bypassUntil: "2026-03-12T05:10:00.000Z",
      lastFailureAt: "2026-03-12T05:09:00.000Z",
      message: "Redis cache bypass active; distributed query cache temporarily disabled.",
    });

    const request = new Request("http://localhost/api/health", {
      headers: {
        "x-health-token": "health-secret",
      },
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.checks.cache).toMatchObject({
      state: "warn",
      backend: "upstash",
      bypassActive: true,
      bypassRemainingMs: 4321,
    });
    expect(payload.checks.cache.message).toContain("Redis cache bypass active");
  });
});
