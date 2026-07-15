import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_GUEST_POST_POLICY,
  GUEST_POST_POLICY_KEY,
} from "@/lib/guest-post-policy";
import { prisma } from "@/lib/prisma";
import { bumpCacheVersion } from "@/server/cache/query-cache";
import {
  setGuestPostPolicy,
  setPopularPostPolicy,
} from "@/server/services/moderation/policy-write.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteSetting: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/server/cache/query-cache", () => ({
  bumpCacheVersion: vi.fn(async () => undefined),
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  siteSetting: { upsert: ReturnType<typeof vi.fn> };
};
const mockBumpCacheVersion = vi.mocked(bumpCacheVersion);

describe("policy write service", () => {
  beforeEach(() => {
    mockPrisma.siteSetting.upsert.mockReset();
    mockBumpCacheVersion.mockReset();
    mockBumpCacheVersion.mockResolvedValue(undefined);
    mockPrisma.siteSetting.upsert.mockResolvedValue({
      key: "policy",
      value: {},
    });
  });

  it("normalizes and persists guest post policy outside the query layer", async () => {
    const result = await setGuestPostPolicy(DEFAULT_GUEST_POST_POLICY);

    expect(result.ok).toBe(true);
    expect(mockPrisma.siteSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: GUEST_POST_POLICY_KEY },
        update: { value: DEFAULT_GUEST_POST_POLICY },
      }),
    );
  });

  it("invalidates policy and feed caches for popular-post policy writes", async () => {
    await setPopularPostPolicy({ minLikes: 12 });

    expect(mockBumpCacheVersion).toHaveBeenCalledWith("policy");
    expect(mockBumpCacheVersion).toHaveBeenCalledWith("feed");
  });
});
