import { describe, expect, it } from "vitest";

import { findViolations } from "./check-query-boundaries";

describe("query boundary check", () => {
  it("accepts read-only query code", () => {
    expect(findViolations("return prisma.post.findMany({ where });", "query.ts")).toEqual([]);
  });

  it("rejects Prisma writes and transactions in query code", () => {
    expect(findViolations("await prisma.post.update({ where, data });", "query.ts")).toHaveLength(1);
    expect(findViolations("return prisma.$transaction([]);", "query.ts")).toHaveLength(1);
  });

  it("does not treat unrelated collection operations as database writes", () => {
    expect(findViolations("seen.delete(value);", "query.ts")).toEqual([]);
  });
});
