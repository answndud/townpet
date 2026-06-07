import { describe, expect, it } from "vitest";

import {
  buildPnpmCommand,
  formatLocalRestoreSummary,
  LOCAL_RESTORE_SEED_STEPS,
} from "./restore-local-dev";

describe("local restore CLI wrapper", () => {
  it("keeps the local restore seed steps in expected order", () => {
    expect(LOCAL_RESTORE_SEED_STEPS).toEqual([
      "db:seed",
      "db:seed:users",
      "db:seed:local-test-accounts",
      "db:seed:board-posts",
      "db:seed:care-demo",
      "db:seed:adoption-demo",
      "db:seed:comment-best-demo",
      "db:seed:search-cases",
      "db:seed:reports",
      "db:seed:engagement",
    ]);
  });

  it("uses npm_execpath when the script is invoked through pnpm", () => {
    expect(buildPnpmCommand(["db:push"], "/path/to/pnpm.cjs")).toEqual({
      command: process.execPath,
      args: ["/path/to/pnpm.cjs", "-C", expect.stringContaining("/app"), "db:push"],
    });
  });

  it("falls back to corepack pnpm when npm_execpath is absent", () => {
    expect(buildPnpmCommand(["db:push"], "")).toEqual({
      command: "corepack",
      args: ["pnpm", "-C", expect.stringContaining("/app"), "db:push"],
    });
  });

  it("formats the restore summary as stable JSON", () => {
    expect(
      formatLocalRestoreSummary({
        users: 10,
        withPassword: 8,
        withoutPassword: 2,
        posts: 12,
        comments: 20,
        reports: 3,
        postReactions: 4,
        commentReactions: 5,
      }),
    ).toBe(
      [
        "{",
        '  "users": 10,',
        '  "withPassword": 8,',
        '  "withoutPassword": 2,',
        '  "posts": 12,',
        '  "comments": 20,',
        '  "reports": 3,',
        '  "postReactions": 4,',
        '  "commentReactions": 5',
        "}",
      ].join("\n"),
    );
  });
});
