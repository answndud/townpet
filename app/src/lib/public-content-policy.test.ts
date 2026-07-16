import { describe, expect, it } from "vitest";

import { buildPublicDemoContentExclusion } from "./public-content-policy";

describe("public content policy", () => {
  it("excludes only explicitly flagged demo posts from every public query", () => {
    const where = buildPublicDemoContentExclusion();
    expect(where).toEqual({ isDemoContent: false });
  });
});
