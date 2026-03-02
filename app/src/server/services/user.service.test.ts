import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { updateProfile } from "@/server/services/user.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe("user service", () => {
  beforeEach(() => {
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.user.update.mockReset();
  });

  it("blocks nickname change within 30 days", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        id: "user-1",
        nickname: "old-name",
        nicknameUpdatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      })
      .mockResolvedValueOnce(null);

    await expect(
      updateProfile({
        userId: "user-1",
        input: { nickname: "new-name", bio: "hello" },
      }),
    ).rejects.toMatchObject({
      code: "NICKNAME_CHANGE_RATE_LIMITED",
      status: 429,
    });
  });

  it("allows nickname change after 30 days", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        id: "user-1",
        nickname: "old-name",
        nicknameUpdatedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      })
      .mockResolvedValueOnce(null);
    mockPrisma.user.update.mockResolvedValue({ id: "user-1" });

    await updateProfile({
      userId: "user-1",
      input: { nickname: "new-name", bio: "hello" },
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nickname: "new-name",
          nicknameUpdatedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("does not apply cooldown when nickname is unchanged", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        id: "user-1",
        nickname: "same-name",
        nicknameUpdatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      })
      .mockResolvedValueOnce({ id: "user-1" });
    mockPrisma.user.update.mockResolvedValue({ id: "user-1" });

    await updateProfile({
      userId: "user-1",
      input: { nickname: "same-name", bio: "updated" },
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nicknameUpdatedAt: undefined,
        }),
      }),
    );
  });
});
