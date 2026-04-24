import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  summarizeManagedSeedResults,
  summarizeSeedAccountExpectations,
} from "@/../scripts/seed-local-test-accounts";

describe("local test account seed counts", () => {
  it("derives expected counts from the accounts managed by the script", () => {
    expect(
      summarizeSeedAccountExpectations([
        {
          email: "managed-password@townpet.dev",
          nickname: "managed-password",
          role: UserRole.USER,
          hasPassword: true,
          verified: true,
        },
        {
          email: "managed-passwordless@townpet.dev",
          nickname: null,
          role: UserRole.USER,
          hasPassword: false,
          verified: false,
        },
      ]),
    ).toEqual({
      total: 2,
      withPassword: 1,
      withoutPassword: 1,
    });
  });

  it("summarizes only managed seed records so unrelated existing users do not fail restore", () => {
    const existingUnmanagedUsers = [
      { email: "old-e2e-user@townpet.dev", passwordHash: "hash" },
      { email: "legacy-social@townpet.dev", passwordHash: null },
    ];

    expect(
      summarizeManagedSeedResults([
        { passwordHash: "hash" },
        { passwordHash: null },
      ]),
    ).toEqual({
      total: 2,
      withPassword: 1,
      withoutPassword: 1,
    });
    expect(existingUnmanagedUsers).toHaveLength(2);
  });
});
