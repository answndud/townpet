import { PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { isLocalRequiredPostType } from "@/lib/post-scope-policy";

describe("post scope policy", () => {
  it("marks WALK_ROUTE and MEETUP as local-required", () => {
    expect(isLocalRequiredPostType(PostType.WALK_ROUTE)).toBe(true);
    expect(isLocalRequiredPostType(PostType.MEETUP)).toBe(true);
  });

  it("keeps non-local board types as global-capable", () => {
    expect(isLocalRequiredPostType(PostType.FREE_BOARD)).toBe(false);
    expect(isLocalRequiredPostType(PostType.HOSPITAL_REVIEW)).toBe(false);
  });

  it("returns false for undefined type", () => {
    expect(isLocalRequiredPostType(undefined)).toBe(false);
  });
});
