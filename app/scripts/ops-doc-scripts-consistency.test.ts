import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "../..");
const appPackage = JSON.parse(
  readFileSync(resolve(repoRoot, "app/package.json"), "utf8"),
) as { scripts: Record<string, string> };

const scriptNames = new Set(Object.keys(appPackage.scripts));
const pnpmBuiltinsAndBinaries = new Set([
  "audit",
  "dlx",
  "exec",
  "install",
  "prisma",
  "run",
]);

const checkedDocs = [
  "README.md",
  "AGENTS.md",
  "app/README.md",
  "business/operations/운영_문서_안내.md",
  "business/operations/manual-checks/배포_보안_체크리스트.md",
  "business/operations/OAuth_외부로그인_운영_가이드.md",
  "business/operations/Vercel_OAuth_초기설정_가이드.md",
];

function readRepoFile(path: string) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function extractPnpmScriptRefs(content: string) {
  const refs = new Set<string>();
  const pattern = /(?:corepack\s+)?pnpm(?:\s+-C\s+app)?\s+([a-zA-Z0-9:_*-]+)/g;
  for (const match of content.matchAll(pattern)) {
    const command = match[1];
    if (command !== "-C" && !command.includes("*") && !pnpmBuiltinsAndBinaries.has(command)) {
      refs.add(command);
    }
  }
  return [...refs].sort();
}

describe("operational documentation package scripts", () => {
  it("references only package scripts that exist in app/package.json", () => {
    const missing: string[] = [];

    for (const docPath of checkedDocs) {
      const refs = extractPnpmScriptRefs(readRepoFile(docPath));
      for (const ref of refs) {
        if (!scriptNames.has(ref)) {
          missing.push(`${docPath}: ${ref}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it("keeps the minimum operating routine documented", () => {
    const operationsGuide = readRepoFile("business/operations/운영_문서_안내.md");

    expect(operationsGuide).toContain("pnpm -C app quality:check");
    expect(operationsGuide).toContain("pnpm -C app ops:check:health");
    expect(operationsGuide).toContain("pnpm -C app db:restore:local");
    expect(operationsGuide).toContain("pnpm -C app test:e2e:smoke");
  });
});
