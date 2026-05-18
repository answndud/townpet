import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  collectApiRouteContracts,
  extractRouteMethods,
  inferRouteAccess,
  inferRouteMonitoring,
  inferRouteValidation,
  renderApiRouteContractsMarkdown,
  runApiRouteContractCheck,
} from "@/../scripts/check-api-route-contracts";

let tempDir: string;

async function writeRoute(relativePath: string, source: string, withTest = false) {
  const routeDir = path.join(tempDir, "src/app/api", relativePath);
  await mkdir(routeDir, { recursive: true });
  await writeFile(path.join(routeDir, "route.ts"), source, "utf8");
  if (withTest) {
    await writeFile(path.join(routeDir, "route.test.ts"), "import { it } from 'vitest';\n", "utf8");
  }
}

describe("api route contract check", () => {
  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `townpet-api-contract-test-${Date.now()}`);
    await mkdir(path.join(tempDir, "src/app/api"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("extracts function, const, and destructured HTTP method exports", () => {
    expect(
      extractRouteMethods(`
        export async function GET() {}
        export const POST = handler;
        export const { PATCH, DELETE } = handlers;
      `),
    ).toEqual(["GET", "POST", "PATCH", "DELETE"]);
  });

  it("infers access, validation, and monitoring heuristics", () => {
    expect(inferRouteAccess("export const { GET, POST } = NextAuth(config);", "/api/auth/[...nextauth]")).toBe(
      "provider-managed",
    );
    expect(inferRouteAccess("const user = await requireModerator();", "/api/reports/bulk")).toBe("moderator");
    expect(inferRouteAccess("const user = await requireCurrentUser();", "/api/auth/password/setup")).toBe(
      "authenticated",
    );
    expect(
      inferRouteAccess(
        "if (!userId) return jsonError(401, { code: 'AUTH_REQUIRED' });",
        "/api/posts/[id]",
      ),
    ).toBe("authenticated");
    expect(inferRouteAccess("const session = await auth().catch(() => null);", "/api/viewer-shell")).toBe(
      "auth-aware",
    );
    expect(
      inferRouteAccess(
        "const userId = hasSessionCookieFromRequest(request) ? await getCurrentUserId() : null; if (!userId) return jsonError(401);",
        "/api/posts",
      ),
    ).toBe("auth-aware");

    expect(inferRouteValidation("const parsed = querySchema.safeParse(input);", "/api/posts")).toBe("schema");
    expect(inferRouteValidation("const body = await request.json(); await update({ input: body });", "/api/reports")).toBe(
      "service-delegated",
    );
    expect(inferRouteValidation("const { searchParams } = new URL(request.url);", "/api/items")).toBe("manual");

    expect(inferRouteMonitoring("await monitorUnhandledError(error, { request });", "/api/posts")).toBe(
      "monitorUnhandledError",
    );
    expect(inferRouteMonitoring("logger.warn('degraded');", "/api/health")).toBe("logger");
  });

  it("collects route contracts with methods and adjacent test status", async () => {
    await writeRoute("posts/[id]", "export async function GET() {}\nexport async function PATCH() {}", true);
    await writeRoute("auth/[...nextauth]", "export const { GET, POST } = handlers;\n");

    const contracts = await collectApiRouteContracts({ appRoot: tempDir });

    expect(contracts).toEqual([
      {
        route: "/api/auth/[...nextauth]",
        methods: ["GET", "POST"],
        file: "src/app/api/auth/[...nextauth]/route.ts",
        adjacentTest: false,
        access: "provider-managed",
        validation: "provider-managed",
        monitoring: "provider-managed",
      },
      {
        route: "/api/posts/[id]",
        methods: ["GET", "PATCH"],
        file: "src/app/api/posts/[id]/route.ts",
        adjacentTest: true,
        access: "public",
        validation: "none",
        monitoring: "none",
      },
    ]);
  });

  it("writes and checks a deterministic contract report", async () => {
    await writeRoute("health", "export async function GET() {}", true);
    const outputPath = path.join(tempDir, "api-route-contracts.generated.md");

    await runApiRouteContractCheck({
      appRoot: tempDir,
      outputPath,
      mode: "write",
    });
    const report = await readFile(outputPath, "utf8");

    expect(report).toBe(
      renderApiRouteContractsMarkdown([
        {
          route: "/api/health",
          methods: ["GET"],
          file: "src/app/api/health/route.ts",
          adjacentTest: true,
          access: "public",
          validation: "none",
          monitoring: "none",
        },
      ]),
    );
    await expect(
      runApiRouteContractCheck({
        appRoot: tempDir,
        outputPath,
        mode: "check",
      }),
    ).resolves.toBeTruthy();
  });

  it("fails check mode when the report is stale", async () => {
    await writeRoute("posts", "export async function GET() {}", false);
    const outputPath = path.join(tempDir, "api-route-contracts.generated.md");
    await writeFile(outputPath, "stale\n", "utf8");

    await expect(
      runApiRouteContractCheck({
        appRoot: tempDir,
        outputPath,
        mode: "check",
      }),
    ).rejects.toThrow("API route contract report is stale.");
  });
});
