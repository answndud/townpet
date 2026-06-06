import "dotenv/config";

import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
const MUTATING_HTTP_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CURRENT_FILE_PATH = fileURLToPath(import.meta.url);

type ApiRouteAccess =
  | "provider-managed"
  | "admin"
  | "moderator"
  | "authenticated"
  | "auth-aware"
  | "public-internal-token"
  | "public";

type ApiRouteValidation =
  | "provider-managed"
  | "schema"
  | "service-delegated"
  | "manual"
  | "no-input"
  | "static-response"
  | "none";

type ApiRouteMonitoring =
  | "monitorUnhandledError"
  | "logger"
  | "provider-managed"
  | "static-response"
  | "none";

export type ApiRouteContract = {
  route: string;
  methods: string[];
  file: string;
  adjacentTest: boolean;
  access: ApiRouteAccess;
  validation: ApiRouteValidation;
  monitoring: ApiRouteMonitoring;
};

export type ApiRouteContractStrictGap = {
  route: string;
  file: string;
  kind: "validation-none" | "mutating-monitoring-none";
  detail: string;
};

async function listRouteFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listRouteFiles(fullPath);
      }
      return entry.isFile() && entry.name === "route.ts" ? [fullPath] : [];
    }),
  );

  return files.flat().sort();
}

function toPosixPath(value: string) {
  return value.split(path.sep).join("/");
}

export function extractRouteMethods(source: string) {
  return HTTP_METHODS.filter((method) => {
    const patterns = [
      new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`),
      new RegExp(`export\\s+const\\s+${method}\\b`),
      new RegExp(`export\\s+const\\s*\\{[^}]*\\b${method}\\b[^}]*\\}`),
      new RegExp(`export\\s*\\{[^}]*\\b${method}\\b[^}]*\\}`),
    ];
    return patterns.some((pattern) => pattern.test(source));
  });
}

function isProviderManagedRoute(source: string, route: string) {
  return route === "/api/auth/[...nextauth]" || source.includes("NextAuth(");
}

function isStaticResponseRoute(source: string) {
  return (
    source.includes("DIRECT_UPLOAD_DISABLED") ||
    (source.includes("jsonError(410") && !source.includes("request."))
  );
}

function hasRouteInput(source: string) {
  return (
    source.includes("request.json(") ||
    source.includes("request.formData(") ||
    source.includes("searchParams") ||
    source.includes("nextUrl.searchParams") ||
    source.includes("await params") ||
    source.includes("params.")
  );
}

export function inferRouteAccess(source: string, route: string): ApiRouteAccess {
  if (isProviderManagedRoute(source, route)) {
    return "provider-managed";
  }
  if (source.includes("requireAdminUserId") || source.includes("requireAdmin(")) {
    return "admin";
  }
  if (source.includes("requireModerator")) {
    return "moderator";
  }
  if (source.includes("canAccessInternalDiagnostics") || source.includes("healthInternalToken")) {
    return "public-internal-token";
  }
  if (
    source.includes("requireCurrentUserId") ||
    source.includes("requireCurrentUser") ||
    source.includes("requireAuthenticated") ||
    source.includes("requireAuth") ||
    source.includes("requireUser") ||
    source.includes("requireSession")
  ) {
    return "authenticated";
  }
  if (source.includes("hasSessionCookieFromRequest") || source.includes("auth().catch")) {
    return "auth-aware";
  }
  if (
    source.includes("return jsonError(401") ||
    source.includes("status: 401") ||
    source.includes("{ status: 401")
  ) {
    return "authenticated";
  }
  if (
    source.includes("getCurrentUserId") ||
    source.includes("getCurrentUserIdFromRequest") ||
    source.includes("auth()")
  ) {
    return "auth-aware";
  }

  return "public";
}

export function inferRouteValidation(source: string, route: string): ApiRouteValidation {
  if (isProviderManagedRoute(source, route)) {
    return "provider-managed";
  }
  if (isStaticResponseRoute(source)) {
    return "static-response";
  }
  if (
    source.includes(".safeParse(") ||
    source.includes(".parse(") ||
    source.includes("z.object(") ||
    source.includes("z.enum(") ||
    /Schema\b/.test(source)
  ) {
    return "schema";
  }
  if (
    source.includes("request.json()") &&
    (source.includes("ServiceError") ||
      source.includes("input: body") ||
      source.includes("payload: body"))
  ) {
    return "service-delegated";
  }
  if (
    source.includes("searchParams") ||
    source.includes("nextUrl.searchParams") ||
    source.includes("await params") ||
    source.includes("params.") ||
    source.includes("sanitizeCspReport") ||
    source.includes("jsonError(400") ||
    source.includes("status: 400") ||
    source.includes("{ status: 400")
  ) {
    return "manual";
  }
  if (!hasRouteInput(source)) {
    return "no-input";
  }

  return "none";
}

export function inferRouteMonitoring(source: string, route: string): ApiRouteMonitoring {
  if (isProviderManagedRoute(source, route)) {
    return "provider-managed";
  }
  if (isStaticResponseRoute(source)) {
    return "static-response";
  }
  if (source.includes("monitorUnhandledError")) {
    return "monitorUnhandledError";
  }
  if (source.includes("logger.warn") || source.includes("logger.error")) {
    return "logger";
  }
  return "none";
}

export async function collectApiRouteContracts(params?: {
  apiRoot?: string;
  appRoot?: string;
}) {
  const appRoot = params?.appRoot ?? process.cwd();
  const apiRoot = params?.apiRoot ?? path.join(appRoot, "src/app/api");
  const routeFiles = await listRouteFiles(apiRoot);

  const contracts = await Promise.all(
    routeFiles.map(async (filePath): Promise<ApiRouteContract> => {
      const source = await readFile(filePath, "utf8");
      const routeDir = path.dirname(filePath);
      const routeRelativePath = toPosixPath(path.relative(apiRoot, routeDir));
      const file = toPosixPath(path.relative(appRoot, filePath));
      return {
        route: routeRelativePath ? `/api/${routeRelativePath}` : "/api",
        methods: extractRouteMethods(source),
        file,
        adjacentTest: existsSync(path.join(routeDir, "route.test.ts")),
        access: inferRouteAccess(source, routeRelativePath ? `/api/${routeRelativePath}` : "/api"),
        validation: inferRouteValidation(source, routeRelativePath ? `/api/${routeRelativePath}` : "/api"),
        monitoring: inferRouteMonitoring(source, routeRelativePath ? `/api/${routeRelativePath}` : "/api"),
      };
    }),
  );

  return contracts.sort((a, b) => a.route.localeCompare(b.route));
}

export function renderApiRouteContractsMarkdown(contracts: ApiRouteContract[]) {
  const missingMethods = contracts.filter((contract) => contract.methods.length === 0);
  const missingAdjacentTests = contracts.filter((contract) => !contract.adjacentTest);
  const accessCounts = countBy(contracts, (contract) => contract.access);
  const validationCounts = countBy(contracts, (contract) => contract.validation);
  const monitoringCounts = countBy(contracts, (contract) => contract.monitoring);
  const lines: string[] = [];

  lines.push("# TownPet API Route Contracts");
  lines.push("");
  lines.push("Generated from `app/src/app/api/**/route.ts` with source-text heuristics.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- routeHandlers: ${contracts.length}`);
  lines.push(`- missingMethodExports: ${missingMethods.length}`);
  lines.push(`- missingAdjacentTests: ${missingAdjacentTests.length}`);
  lines.push(`- accessHeuristics: ${formatCounts(accessCounts)}`);
  lines.push(`- validationHeuristics: ${formatCounts(validationCounts)}`);
  lines.push(`- monitoringHeuristics: ${formatCounts(monitoringCounts)}`);
  lines.push("");
  lines.push("Heuristic labels are review aids, not a security proof. Source of truth remains route code and tests.");
  lines.push("");
  lines.push("## Routes");
  lines.push("");
  lines.push("| Route | Methods | Access | Validation | Monitoring | Route file | Adjacent test |");
  lines.push("|---|---:|---|---|---|---|---:|");

  for (const contract of contracts) {
    lines.push(
      `| \`${contract.route}\` | ${contract.methods.length > 0 ? contract.methods.join(", ") : "NONE"} | ${contract.access} | ${contract.validation} | ${contract.monitoring} | \`${contract.file}\` | ${contract.adjacentTest ? "yes" : "no"} |`,
    );
  }

  lines.push("");
  lines.push("## Gaps");
  lines.push("");
  if (missingMethods.length === 0 && missingAdjacentTests.length === 0) {
    lines.push("- None");
  } else {
    for (const contract of missingMethods) {
      lines.push(`- missing method export: \`${contract.file}\``);
    }
    for (const contract of missingAdjacentTests) {
      lines.push(`- missing adjacent test: \`${contract.file}\``);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function findApiRouteContractStrictGaps(contracts: ApiRouteContract[]) {
  const gaps: ApiRouteContractStrictGap[] = [];

  for (const contract of contracts) {
    if (contract.validation === "none") {
      gaps.push({
        route: contract.route,
        file: contract.file,
        kind: "validation-none",
        detail: "route has detectable input but no schema/manual/service-delegated validation heuristic",
      });
    }

    const hasMutatingMethod = contract.methods.some((method) => MUTATING_HTTP_METHODS.has(method));
    if (hasMutatingMethod && contract.monitoring === "none") {
      gaps.push({
        route: contract.route,
        file: contract.file,
        kind: "mutating-monitoring-none",
        detail: "mutating route has no monitorUnhandledError/logger/static/provider monitoring heuristic",
      });
    }
  }

  return gaps;
}

function countBy<T>(values: T[], getKey: (value: T) => string) {
  return values.reduce<Record<string, number>>((counts, value) => {
    const key = getKey(value);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function formatCounts(counts: Record<string, number>) {
  return Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}=${count}`)
    .join(", ");
}

export async function runApiRouteContractCheck(params?: {
  appRoot?: string;
  apiRoot?: string;
  outputPath?: string;
  mode?: "check" | "write" | "print";
  strict?: boolean;
}) {
  const appRoot = params?.appRoot ?? process.cwd();
  const outputPath =
    params?.outputPath ??
    path.resolve(appRoot, "../business/reports/api-route-contracts.generated.md");
  const mode = params?.mode ?? "print";
  const strict = params?.strict ?? false;
  const contracts = await collectApiRouteContracts({ apiRoot: params?.apiRoot, appRoot });
  const generated = renderApiRouteContractsMarkdown(contracts);
  const missingMethods = contracts.filter((contract) => contract.methods.length === 0);
  const strictGaps = strict ? findApiRouteContractStrictGaps(contracts) : [];

  if (mode === "write") {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, generated, "utf8");
    console.log(`Updated ${path.relative(appRoot, outputPath)}`);
  } else if (mode === "check") {
    const current = existsSync(outputPath) ? await readFile(outputPath, "utf8") : "";
    if (current !== generated) {
      throw new Error(
        `API route contract report is stale. Run \`pnpm api:contracts:write\`. output=${outputPath}`,
      );
    }
    console.log(`${path.relative(appRoot, outputPath)} is up to date.`);
  } else {
    process.stdout.write(generated);
  }

  if (missingMethods.length > 0) {
    throw new Error(
      `API route contract check found route files without HTTP method exports: ${missingMethods
        .map((contract) => contract.file)
        .join(", ")}`,
    );
  }

  if (strictGaps.length > 0) {
    throw new Error(
      `API route contract strict check found gaps: ${strictGaps
        .map((gap) => `${gap.kind}:${gap.file}`)
        .join(", ")}`,
    );
  }

  return { contracts, outputPath };
}

function resolveMode(argv: string[]) {
  if (argv.includes("--write")) {
    return "write" as const;
  }
  if (argv.includes("--check")) {
    return "check" as const;
  }
  return "print" as const;
}

export async function main() {
  const argv = process.argv.slice(2);
  await runApiRouteContractCheck({
    mode: resolveMode(argv),
    strict: argv.includes("--strict"),
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === CURRENT_FILE_PATH) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
