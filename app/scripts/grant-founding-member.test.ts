import { describe, expect, it } from "vitest";

import { parseGrantOptions } from "./grant-founding-member";

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
});
