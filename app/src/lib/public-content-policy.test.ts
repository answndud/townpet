import { describe, expect, it } from "vitest";

import { buildPublicDemoContentExclusion } from "./public-content-policy";

describe("public content policy", () => {
  it("excludes demo signals from every public post query", () => {
    const where = buildPublicDemoContentExclusion();
    const not = where.NOT;

    expect(Array.isArray(not)).toBe(true);
    expect(not).toEqual(
      expect.arrayContaining([
        { title: { contains: "테스트", mode: "insensitive" } },
        { content: { contains: "visual-smoke", mode: "insensitive" } },
        { author: { nickname: { contains: "townpet-demo", mode: "insensitive" } } },
      ]),
    );
  });
});
