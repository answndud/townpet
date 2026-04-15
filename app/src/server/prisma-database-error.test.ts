import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { isPrismaDatabaseUnavailableError } from "@/server/prisma-database-error";

describe("isPrismaDatabaseUnavailableError", () => {
  it("returns true for Prisma initialization errors", () => {
    expect(
      isPrismaDatabaseUnavailableError(
        new Prisma.PrismaClientInitializationError("db down", "5.22.0"),
      ),
    ).toBe(true);
  });

  it("returns false for non-database-init errors", () => {
    expect(isPrismaDatabaseUnavailableError(new Error("boom"))).toBe(false);
  });
});
