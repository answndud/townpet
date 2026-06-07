import { UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ADMIN_QUEUE_SMOKE_PROVISION_CONFIRM_VALUE,
  provisionAdminQueueSmokeUser,
  resolveAdminQueueSmokeProvisionConfig,
} from "./provision-admin-queue-smoke-user";

vi.mock("../src/server/password", () => ({
  hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
}));

function makeEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://townpet:townpet@localhost:5432/townpet",
    ADMIN_QUEUE_SMOKE_EMAIL: "admin.queue.smoke@townpet.dev",
    ADMIN_QUEUE_SMOKE_PASSWORD: "SmokePassword-123456!",
    ...overrides,
  };
}

describe("resolveAdminQueueSmokeProvisionConfig", () => {
  it("requires explicit confirmation for non-local database provisioning", () => {
    expect(() =>
      resolveAdminQueueSmokeProvisionConfig(
        makeEnv({
          DATABASE_URL: "postgresql://prod:secret@db.example.com:5432/townpet",
          ADMIN_QUEUE_SMOKE_PROVISION_CONFIRM: undefined,
        }),
      ),
    ).toThrow(
      `ADMIN_QUEUE_SMOKE_PROVISION_CONFIRM=${ADMIN_QUEUE_SMOKE_PROVISION_CONFIRM_VALUE} is required`,
    );
  });

  it("accepts a smoke-only townpet.dev email when confirmation is present", () => {
    expect(
      resolveAdminQueueSmokeProvisionConfig(
        makeEnv({
          DATABASE_URL: "postgresql://prod:secret@db.example.com:5432/townpet",
          ADMIN_QUEUE_SMOKE_PROVISION_CONFIRM: ADMIN_QUEUE_SMOKE_PROVISION_CONFIRM_VALUE,
          ADMIN_QUEUE_SMOKE_EMAIL: " Admin.Queue.Smoke@TownPet.Dev ",
        }),
      ),
    ).toEqual({
      databaseUrl: "postgresql://prod:secret@db.example.com:5432/townpet",
      email: "admin.queue.smoke@townpet.dev",
      password: "SmokePassword-123456!",
      nickname: "admin-queue-smoke",
    });
  });

  it("rejects non-smoke or non-townpet admin emails", () => {
    expect(() =>
      resolveAdminQueueSmokeProvisionConfig(
        makeEnv({ ADMIN_QUEUE_SMOKE_EMAIL: "admin@example.com" }),
      ),
    ).toThrow("ADMIN_QUEUE_SMOKE_EMAIL must use @townpet.dev");

    expect(() =>
      resolveAdminQueueSmokeProvisionConfig(
        makeEnv({ ADMIN_QUEUE_SMOKE_EMAIL: "admin.queue@townpet.dev" }),
      ),
    ).toThrow("local-part must include smoke");
  });
});

describe("provisionAdminQueueSmokeUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a verified admin smoke account without exposing the password", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const upsert = vi.fn().mockResolvedValue({
      id: "user-1",
      email: "admin.queue.smoke@townpet.dev",
      role: UserRole.ADMIN,
      emailVerified: new Date("2026-06-07T00:00:00.000Z"),
    });

    const result = await provisionAdminQueueSmokeUser(
      { user: { findUnique, upsert } },
      {
        databaseUrl: "postgresql://prod:secret@db.example.com:5432/townpet",
        email: "admin.queue.smoke@townpet.dev",
        password: "SmokePassword-123456!",
        nickname: "admin-queue-smoke",
      },
    );

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "admin.queue.smoke@townpet.dev" },
        create: expect.objectContaining({
          email: "admin.queue.smoke@townpet.dev",
          nickname: "admin-queue-smoke",
          role: UserRole.ADMIN,
          passwordHash: "hashed:SmokePassword-123456!",
          emailVerified: expect.any(Date),
        }),
      }),
    );
    expect(JSON.stringify(result)).not.toContain("SmokePassword");
    expect(result).toMatchObject({
      action: "created",
      identifierLabel: "ad***@to***.dev",
      role: UserRole.ADMIN,
      emailVerified: true,
    });
  });

  it("updates an existing account and increments sessionVersion", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: "user-1",
      email: "admin.queue.smoke@townpet.dev",
      nickname: "admin-queue-smoke",
    });
    const upsert = vi.fn().mockResolvedValue({
      id: "user-1",
      email: "admin.queue.smoke@townpet.dev",
      role: UserRole.ADMIN,
      emailVerified: new Date("2026-06-07T00:00:00.000Z"),
    });

    const result = await provisionAdminQueueSmokeUser(
      { user: { findUnique, upsert } },
      {
        databaseUrl: "postgresql://prod:secret@db.example.com:5432/townpet",
        email: "admin.queue.smoke@townpet.dev",
        password: "SmokePassword-123456!",
        nickname: "admin-queue-smoke",
      },
    );

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          role: UserRole.ADMIN,
          passwordHash: "hashed:SmokePassword-123456!",
          emailVerified: expect.any(Date),
          sessionVersion: { increment: 1 },
        }),
      }),
    );
    expect(result.action).toBe("updated");
  });
});
