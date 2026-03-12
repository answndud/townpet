import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { findUserByEmailInsensitive } from "@/server/queries/user.queries";
import { hashPassword } from "@/server/password";
import { registerUser } from "@/server/services/auth.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/server/queries/user.queries", () => ({
  findUserByEmailInsensitive: vi.fn(),
}));

vi.mock("@/server/password", () => ({
  hashPassword: vi.fn(),
  hashToken: vi.fn(),
  verifyPassword: vi.fn(),
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

const mockFindUserByEmailInsensitive = vi.mocked(findUserByEmailInsensitive);
const mockHashPassword = vi.mocked(hashPassword);

describe("registerUser", () => {
  beforeEach(() => {
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.user.create.mockReset();
    mockFindUserByEmailInsensitive.mockReset();
    mockHashPassword.mockReset();
  });

  it("rejects reserved operator-style emails before touching persistence", async () => {
    await expect(
      registerUser({
        input: {
          email: "admin@gmail.com",
          password: "Townpet!2026",
          nickname: "tester01",
        },
      }),
    ).rejects.toMatchObject({
      code: "RESERVED_LOGIN_IDENTIFIER",
      status: 400,
    } satisfies Partial<ServiceError>);

    expect(mockFindUserByEmailInsensitive).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockHashPassword).not.toHaveBeenCalled();
  });
});
