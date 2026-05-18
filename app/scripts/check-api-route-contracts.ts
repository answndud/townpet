import "dotenv/config";

import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
const CURRENT_FILE_PATH = fileURLToPath(import.meta.url);

export type ApiRouteContract = {
  route: string;
  methods: string[];
  file: string;
  adjacentTest: boolean;
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
      };
    }),
  );

  return contracts.sort((a, b) => a.route.localeCompare(b.route));
}

export function renderApiRouteContractsMarkdown(contracts: ApiRouteContract[]) {
  const missingMethods = contracts.filter((contract) => contract.methods.length === 0);
  const missingAdjacentTests = contracts.filter((contract) => !contract.adjacentTest);
  const lines: string[] = [];

  lines.push("# TownPet API Route Contracts");
  lines.push("");
  lines.push("Generated from `app/src/app/api/**/route.ts`.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- routeHandlers: ${contracts.length}`);
  lines.push(`- missingMethodExports: ${missingMethods.length}`);
  lines.push(`- missingAdjacentTests: ${missingAdjacentTests.length}`);
  lines.push("");
  lines.push("## Routes");
  lines.push("");
  lines.push("| Route | Methods | Route file | Adjacent test |");
  lines.push("|---|---:|---|---:|");

  for (const contract of contracts) {
    lines.push(
      `| \`${contract.route}\` | ${contract.methods.length > 0 ? contract.methods.join(", ") : "NONE"} | \`${contract.file}\` | ${contract.adjacentTest ? "yes" : "no"} |`,
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

export async function runApiRouteContractCheck(params?: {
  appRoot?: string;
  apiRoot?: string;
  outputPath?: string;
  mode?: "check" | "write" | "print";
}) {
  const appRoot = params?.appRoot ?? process.cwd();
  const outputPath =
    params?.outputPath ??
    path.resolve(appRoot, "../business/reports/api-route-contracts.generated.md");
  const mode = params?.mode ?? "print";
  const contracts = await collectApiRouteContracts({ apiRoot: params?.apiRoot, appRoot });
  const generated = renderApiRouteContractsMarkdown(contracts);
  const missingMethods = contracts.filter((contract) => contract.methods.length === 0);

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
  await runApiRouteContractCheck({ mode: resolveMode(process.argv.slice(2)) });
}

if (process.argv[1] && path.resolve(process.argv[1]) === CURRENT_FILE_PATH) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
