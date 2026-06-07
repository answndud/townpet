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
  "business/operations/성능_budget.md",
  "business/operations/manual-checks/배포_보안_체크리스트.md",
  "business/operations/OAuth_외부로그인_운영_가이드.md",
  "business/operations/Vercel_OAuth_초기설정_가이드.md",
  "business/operations/에이전트_운영_가이드.md",
  "business/operations/에이전트_프롬프트_템플릿.md",
  "business/operations/차단 해소 체크리스트.md",
  "business/operations/돌봄_운영_런북.md",
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

  it("keeps focused performance target filters documented", () => {
    const performanceBudget = readRepoFile("business/operations/성능_budget.md");

    expect(performanceBudget).toContain("PERF_TARGETS=post_detail");
    expect(performanceBudget).toContain("PERF_POST_ID=<public-post-id>");
    expect(performanceBudget).toContain("PERF_EXTRA_PATHS=/api/health");
    expect(performanceBudget).toContain("PERF_BROWSER_TARGETS=post_detail");
    expect(performanceBudget).toContain("PERF_BROWSER_EXTRA_PATHS=/feed/guest");
    expect(performanceBudget).toContain("PERF_ASSET_TARGETS=guest_feed");
    expect(performanceBudget).toContain("PERF_ASSET_EXTRA_PATHS=/feed/guest");
    expect(performanceBudget).toContain("PERF_API_TIMING_TARGETS=guest_feed");
    expect(performanceBudget).toContain("OPS_PERF_TARGETS=api_feed_guest");
    expect(performanceBudget).toContain("PERF_DB_TARGETS=guest_feed_api");
  });

  it("keeps performance report output envs documented", () => {
    const performanceBudget = readRepoFile("business/operations/성능_budget.md");

    expect(performanceBudget).toContain("PERF_OUT=../docs/reports/performance-baseline-custom.md");
    expect(performanceBudget).toContain(
      "PERF_JSON_OUT=../docs/reports/performance-baseline-custom.json",
    );
    expect(performanceBudget).toContain(
      "PERF_BROWSER_OUT=../docs/reports/performance-browser-custom.md",
    );
    expect(performanceBudget).toContain(
      "PERF_BROWSER_JSON_OUT=../docs/reports/performance-browser-custom.json",
    );
    expect(performanceBudget).toContain(
      "PERF_ASSET_OUT=../docs/reports/performance-route-assets-custom.md",
    );
    expect(performanceBudget).toContain(
      "PERF_ASSET_JSON_OUT=../docs/reports/performance-route-assets-custom.json",
    );
    expect(performanceBudget).toContain(
      "PERF_API_TIMING_OUT=../docs/reports/api-route-timings-custom.md",
    );
    expect(performanceBudget).toContain(
      "OPS_PERF_OUT=../docs/reports/api-latency-snapshot-custom.tsv",
    );
    expect(performanceBudget).toContain(
      "OPS_PERF_SUMMARY_OUT=../docs/reports/api-latency-snapshot-custom.summary.md",
    );
    expect(performanceBudget).toContain(
      "PERF_DB_OUT=../docs/reports/performance-db-readiness-custom.md",
    );
    expect(performanceBudget).toContain(
      "PERF_DB_JSON_OUT=../docs/reports/performance-db-readiness-custom.json",
    );
    expect(performanceBudget).toContain(
      "WEB_VITALS_REPORT_OUT=../docs/reports/web-vitals-summary-custom.md",
    );
    expect(performanceBudget).toContain(
      "WEB_VITALS_REPORT_OUT=../docs/reports/web-vitals-remote-summary-custom.md",
    );
    expect(performanceBudget).toContain("pnpm -C app perf:web-vitals:remote");
    expect(performanceBudget).toContain("OPS_HEALTH_INTERNAL_TOKEN=<HEALTH_INTERNAL_TOKEN>");
    expect(performanceBudget).toContain("WEB_VITALS_REPORT_DAYS=7");
    expect(performanceBudget).toContain("WEB_VITALS_REPORT_LIMIT=5000");
  });
});
