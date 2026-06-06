import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getWebVitalSummary, type WebVitalSummary } from "@/server/queries/web-vitals.queries";
import { prisma } from "@/lib/prisma";

type WebVitalsReportEnv = Partial<Record<string, string | undefined>>;

const CURRENT_FILE_PATH = fileURLToPath(import.meta.url);

function compactTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function parsePositiveIntegerEnv(name: string, value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer. received=${value}`);
  }

  return parsed;
}

export function resolveWebVitalsReportOptions(env: WebVitalsReportEnv) {
  return {
    days: parsePositiveIntegerEnv("WEB_VITALS_REPORT_DAYS", env.WEB_VITALS_REPORT_DAYS, 7),
    limit: parsePositiveIntegerEnv("WEB_VITALS_REPORT_LIMIT", env.WEB_VITALS_REPORT_LIMIT, 5000),
  };
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value < 10 ? value.toFixed(3).replace(/0+$/u, "").replace(/\.$/u, "") : Math.round(value).toString();
}

function formatDate(value: Date | null) {
  return value ? value.toISOString() : "-";
}

export function renderMarkdown(summary: WebVitalSummary) {
  const lines = [
    "# Web Vitals Summary",
    "",
    `- generatedAt: \`${new Date().toISOString()}\``,
    `- days: \`${summary.days}\``,
    `- limit: \`${summary.limit}\``,
    `- schemaSyncRequired: \`${summary.schemaSyncRequired}\``,
    `- sampleCount: \`${summary.sampleCount}\``,
    "",
  ];

  if (summary.schemaSyncRequired) {
    lines.push(
      "## Result",
      "",
      "- status: `SCHEMA_SYNC_REQUIRED`",
      "WebVitalSample table 또는 Prisma client가 아직 배포/동기화되지 않아 수집 요약을 만들 수 없습니다.",
      "- next: migration과 Prisma client 배포 상태를 먼저 확인한 뒤 report를 다시 생성하세요.",
      "",
    );
    return lines.join("\n");
  }

  if (summary.rows.length === 0) {
    lines.push(
      "## Result",
      "",
      "- status: `NO_SAMPLES`",
      "최근 기간에 수집된 Web Vitals sample이 없습니다.",
      "- next: production 페이지를 실제 브라우저로 방문해 sample 수집을 유도한 뒤 report를 다시 생성하세요.",
      "",
    );
    return lines.join("\n");
  }

  lines.push(
    "## Interpretation",
    "",
    "- p75/p95는 metric별 raw value 기준입니다.",
    "- route별 count가 작으면 trend 판정이 아니라 수집 정상 여부 확인으로만 봅니다.",
    "",
  );

  lines.push(
    "## Metric Rows",
    "",
    "| metric | route | count | p75 | p95 | good | needs_improvement | poor | latestAt |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  );

  for (const row of summary.rows) {
    lines.push(
      `| ${row.metric} | \`${row.route}\` | ${row.count} | ${formatNumber(row.p75)} | ${formatNumber(row.p95)} | ${row.goodCount} | ${row.needsImprovementCount} | ${row.poorCount} | ${formatDate(row.latestAt)} |`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

async function main() {
  const { days, limit } = resolveWebVitalsReportOptions(process.env);
  const summary = await getWebVitalSummary({ days, limit });
  const outputPath = path.resolve(
    process.env.WEB_VITALS_REPORT_OUT ??
      path.join("..", "docs", "reports", `web-vitals-summary-${compactTimestamp()}.md`),
  );

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderMarkdown(summary), "utf8");
  console.log(`[web-vitals] wrote ${outputPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === CURRENT_FILE_PATH) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
