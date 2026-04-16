import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = new Set(process.argv.slice(2));
const checkMode = args.has("--check");

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const appDir = join(repoRoot, "app");
const reportPath = join(repoRoot, "docs", "archive", "operations", "문서 동기화 리포트.md");

function stableSort(items) {
  return [...items].sort((a, b) => {
    const left = a.normalize("NFC");
    const right = b.normalize("NFC");
    return left < right ? -1 : left > right ? 1 : 0;
  });
}

function gitLsFiles(...paths) {
  return execFileSync("git", ["ls-files", ...paths], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.normalize("NFC"));
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function normalizeContent(content) {
  return content.replaceAll("\r\n", "\n").normalize("NFC");
}

const docsFiles = stableSort(gitLsFiles("docs").filter((path) => path.endsWith(".md")));

const packageJson = readJson(join(appDir, "package.json"));
const scripts = stableSort(Object.keys(packageJson.scripts ?? {}));

const sortedMigrationDirs = stableSort(
  Array.from(
    new Set(
      gitLsFiles("app/prisma/migrations")
        .filter((path) => path.startsWith("app/prisma/migrations/"))
        .map((path) => path.split("/")[3])
        .filter(Boolean),
    ),
  ),
);

const apiRoutes = stableSort(
  gitLsFiles("app/src/app/api").filter(
    (path) => path.endsWith("/route.ts") || path.endsWith("/route.tsx"),
  ),
);

const lines = [
  "# Docs Sync Report",
  "",
  "This file is auto-generated. Do not edit manually.",
  "",
  "## Docs files",
  `- Total markdown files: ${docsFiles.length}`,
  ...docsFiles.map((file) => `- ${file}`),
  "",
  "## App scripts",
  `- Total scripts: ${scripts.length}`,
  ...scripts.map((name) => `- ${name}`),
  "",
  "## Prisma migrations",
  `- Total migrations: ${sortedMigrationDirs.length}`,
  ...sortedMigrationDirs.map((name) => `- ${name}`),
  "",
  "## API route handlers",
  `- Total route handlers: ${apiRoutes.length}`,
  ...apiRoutes.map((file) => `- ${file}`),
  "",
  "## Usage",
  "- Refresh report: `cd app && pnpm docs:refresh`",
  "- Check staleness: `cd app && pnpm docs:refresh:check`",
  "",
];

const nextContent = normalizeContent(`${lines.join("\n")}`);
const prevContent = existsSync(reportPath)
  ? normalizeContent(readFileSync(reportPath, "utf8"))
  : null;

if (checkMode) {
  if (prevContent !== nextContent) {
    console.error("docs-sync-report.md is stale. Run: cd app && pnpm docs:refresh");
    process.exit(1);
  }
  console.log("docs-sync-report.md is up to date.");
  process.exit(0);
}

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, nextContent, "utf8");
console.log("Updated docs/archive/operations/문서 동기화 리포트.md");
