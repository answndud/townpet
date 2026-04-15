import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_FEED_PERSONALIZATION_POLICY } from "@/lib/feed-personalization-policy";
import { DEFAULT_LOGIN_REQUIRED_POST_TYPES } from "@/lib/post-access";
import { prisma } from "@/lib/prisma";
import {
  getFeedPersonalizationPolicy,
  getGuestReadLoginRequiredPostTypes,
} from "@/server/queries/policy.queries";

vi.mock("@/server/cache/query-cache", async () => {
  const actual = await vi.importActual<typeof import("@/server/cache/query-cache")>(
    "@/server/cache/query-cache",
  );

  return {
    ...actual,
    createQueryCacheKey: vi.fn(async () => "cache:policy"),
    withQueryCache: vi.fn(async ({ fetcher }: { fetcher: () => Promise<unknown> }) => fetcher()),
    bumpCacheVersion: vi.fn(async () => undefined),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  siteSetting?: {
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
};

describe("policy queries", () => {
  beforeEach(() => {
    mockPrisma.siteSetting = {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    };
  });

  it("fails closed when SiteSetting delegate is missing", async () => {
    delete mockPrisma.siteSetting;

    await expect(getGuestReadLoginRequiredPostTypes()).rejects.toMatchObject({
      code: "SCHEMA_SYNC_REQUIRED",
      status: 503,
    });
  });

  it("returns default feed personalization policy when setting is missing", async () => {
    mockPrisma.siteSetting?.findUnique.mockResolvedValue(null);

    await expect(getFeedPersonalizationPolicy()).resolves.toEqual(
      DEFAULT_FEED_PERSONALIZATION_POLICY,
    );
  });

  it("returns fail-closed guest read defaults when the database is unavailable", async () => {
    mockPrisma.siteSetting?.findUnique.mockRejectedValue(
      new Prisma.PrismaClientInitializationError("db down", "5.22.0"),
    );

    await expect(getGuestReadLoginRequiredPostTypes()).resolves.toEqual(
      DEFAULT_LOGIN_REQUIRED_POST_TYPES,
    );
  });

  it("normalizes persisted feed personalization policy values", async () => {
    mockPrisma.siteSetting?.findUnique.mockResolvedValue({
      value: {
        ...DEFAULT_FEED_PERSONALIZATION_POLICY,
        recencyDecayStep: "0.09",
        bookmarkSignalMultiplier: "1.3",
      },
    });

    await expect(getFeedPersonalizationPolicy()).resolves.toMatchObject({
      recencyDecayStep: 0.09,
      bookmarkSignalMultiplier: 1.3,
    });
  });
});
