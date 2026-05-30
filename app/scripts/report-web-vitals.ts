import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getWebVitalSummary, type WebVitalSummary } from "@/server/queries/web-vitals.queries";
import { prisma } from "@/lib/prisma";

function compactTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
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

function renderMarkdown(summary: WebVitalSummary) {
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
      "WebVitalSample table 또는 Prisma client가 아직 배포/동기화되지 않아 수집 요약을 만들 수 없습니다.",
      "",
    );
    return lines.join("\n");
  }

  if (summary.rows.length === 0) {
    lines.push("최근 기간에 수집된 Web Vitals sample이 없습니다.", "");
    return lines.join("\n");
  }

  lines.push(
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
  const days = Number(process.env.WEB_VITALS_REPORT_DAYS ?? 7);
  const limit = Number(process.env.WEB_VITALS_REPORT_LIMIT ?? 5000);
  const summary = await getWebVitalSummary({ days, limit });
  const outputPath = path.resolve(
    process.env.WEB_VITALS_REPORT_OUT ??
      path.join("..", "docs", "reports", `web-vitals-summary-${compactTimestamp()}.md`),
  );

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderMarkdown(summary), "utf8");
  console.log(`[web-vitals] wrote ${outputPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
