import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const seedEntrypoints = [
  "seed-admin.ts",
  "seed-adoption-demo.ts",
  "seed-board-posts.ts",
  "seed-care-demo.ts",
  "seed-comment-best-demo.ts",
  "seed-engagement.ts",
  "seed-local-test-accounts.ts",
  "seed-passwords.ts",
  "seed-production-demo-content.ts",
  "seed-reports.ts",
  "seed-search-cases.ts",
  "seed-users.ts",
  "provision-test-users.ts",
  "e2e-new-user-safety-policy-flow.ts",
  "e2e-notification-comment-flow.ts",
] as const;

const entrypointImporters: Record<(typeof seedEntrypoints)[number], () => Promise<unknown>> = {
  "seed-admin.ts": () => import("./seed-admin"),
  "seed-adoption-demo.ts": () => import("./seed-adoption-demo"),
  "seed-board-posts.ts": () => import("./seed-board-posts"),
  "seed-care-demo.ts": () => import("./seed-care-demo"),
  "seed-comment-best-demo.ts": () => import("./seed-comment-best-demo"),
  "seed-engagement.ts": () => import("./seed-engagement"),
  "seed-local-test-accounts.ts": () => import("./seed-local-test-accounts"),
  "seed-passwords.ts": () => import("./seed-passwords"),
  "seed-production-demo-content.ts": () => import("./seed-production-demo-content"),
  "seed-reports.ts": () => import("./seed-reports"),
  "seed-search-cases.ts": () => import("./seed-search-cases"),
  "seed-users.ts": () => import("./seed-users"),
  "provision-test-users.ts": () => import("./provision-test-users"),
  "e2e-new-user-safety-policy-flow.ts": () => import("./e2e-new-user-safety-policy-flow"),
  "e2e-notification-comment-flow.ts": () => import("./e2e-notification-comment-flow"),
};

describe("seed and provision entrypoints", () => {
  it("can be imported without running seed work", async () => {
    for (const entrypoint of seedEntrypoints) {
      await expect(entrypointImporters[entrypoint]()).resolves.toBeDefined();
    }
  });

  it("does not create PrismaClient at module top level", async () => {
    for (const entrypoint of seedEntrypoints) {
      const source = await fs.readFile(path.join(import.meta.dirname, entrypoint), "utf8");

      expect(source).not.toContain("const prisma = new PrismaClient();");
      expect(source).not.toContain("\nmain()\n  .catch");
    }
  });
});
