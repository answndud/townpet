import { describe, expect, it, vi } from "vitest";

import {
  buildFoundingMemberNextData,
  parseGrantOptions,
  runFoundingMemberGrant,
} from "./grant-founding-member";

describe("grant founding member script options", () => {
  it("parses an email grant target", () => {
    expect(parseGrantOptions(["--email", "user@townpet.dev"])).toEqual({
      email: "user@townpet.dev",
      revoke: false,
      dryRun: false,
    });
  });

  it("requires exactly one user identifier", () => {
    expect(() => parseGrantOptions([])).toThrow("Pass exactly one");
    expect(() =>
      parseGrantOptions(["--email", "user@townpet.dev", "--user-id", "user-1"]),
    ).toThrow("Pass exactly one");
  });

  it("rejects missing option values before database access", () => {
    expect(() => parseGrantOptions(["--email", "--dry-run"])).toThrow("--email requires a value");
    expect(() => parseGrantOptions(["--user-id"])).toThrow("--user-id requires a value");
  });

  it("keeps existing founding member timestamp when granting again", () => {
    const existingDate = new Date("2026-01-01T00:00:00.000Z");

    expect(
      buildFoundingMemberNextData(
        {
          id: "user-1",
          email: "user@townpet.dev",
          nickname: "user",
          isFoundingMember: true,
          foundingMemberSince: existingDate,
        },
        { revoke: false },
        new Date("2026-02-01T00:00:00.000Z"),
      ),
    ).toEqual({
      isFoundingMember: true,
      foundingMemberSince: existingDate,
    });
  });

  it("formats dry-run output without updating the user", async () => {
    const user = {
      id: "user-1",
      email: "user@townpet.dev",
      nickname: "user",
      isFoundingMember: false,
      foundingMemberSince: null,
    };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(user),
        update: vi.fn(),
      },
      $disconnect: vi.fn(),
    };

    const output = await runFoundingMemberGrant(
      prisma as never,
      {
        email: "user@townpet.dev",
        revoke: false,
        dryRun: true,
      },
      new Date("2026-01-01T00:00:00.000Z"),
    );

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(output).toBe(
      [
        "{",
        '  "dryRun": true,',
        '  "user": {',
        '    "id": "user-1",',
        '    "email": "user@townpet.dev",',
        '    "nickname": "user",',
        '    "isFoundingMember": false,',
        '    "foundingMemberSince": null',
        "  },",
        '  "nextData": {',
        '    "isFoundingMember": true,',
        '    "foundingMemberSince": "2026-01-01T00:00:00.000Z"',
        "  }",
        "}",
      ].join("\n"),
    );
  });

  it("updates the user when applying a revoke", async () => {
    const user = {
      id: "user-1",
      email: "user@townpet.dev",
      nickname: "user",
      isFoundingMember: true,
      foundingMemberSince: new Date("2026-01-01T00:00:00.000Z"),
    };
    const updated = {
      ...user,
      isFoundingMember: false,
      foundingMemberSince: null,
    };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(user),
        update: vi.fn().mockResolvedValue(updated),
      },
      $disconnect: vi.fn(),
    };

    const output = await runFoundingMemberGrant(prisma as never, {
      userId: "user-1",
      revoke: true,
      dryRun: false,
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: {
        id: true,
        email: true,
        nickname: true,
        isFoundingMember: true,
        foundingMemberSince: true,
      },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { isFoundingMember: false, foundingMemberSince: null },
      select: {
        id: true,
        email: true,
        nickname: true,
        isFoundingMember: true,
        foundingMemberSince: true,
      },
    });
    expect(output).toContain('"isFoundingMember": false');
    expect(output).toContain('"foundingMemberSince": null');
  });
});
