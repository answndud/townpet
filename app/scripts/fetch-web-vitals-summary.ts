import "dotenv/config";

import { mkdir as mkdirDefault, writeFile as writeFileDefault } from "node:fs/promises";
import path from "node:path";

type WebVitalsRemoteSummaryRow = {
  metric: string;
  route: string;
  count: number;
  p75: number;
  p95: number;
  goodCount: number;
  needsImprovementCount: number;
  poorCount: number;
  latestAt: string | null;
};

type WebVitalsRemoteSummary = {
  status: "OK" | "NO_SAMPLES" | "SCHEMA_SYNC_REQUIRED";
  days: number;
  limit: number;
  schemaSyncRequired: boolean;
  sampleCount: number;
  rows: WebVitalsRemoteSummaryRow[];
};

type WebVitalsRemoteResponse = {
  ok?: boolean;
  data?: WebVitalsRemoteSummary;
  error?: {
    code?: string;
    message?: string;
  };
};

type WebVitalsRemoteOptions = {
  baseUrl: string;
  token: string;
  days: number;
  limit: number;
  outputPath: string;
};

type WebVitalsRemoteEnv = Partial<Record<string, string | undefined>>;

type WebVitalsRemoteSummaryCliResult = {
  summary: WebVitalsRemoteSummary;
  markdown: string;
  output: string;
  exitCode: 0;
};

type WebVitalsRemoteSummaryDeps = {
  fetchFn?: typeof fetch;
  mkdir?: typeof mkdirDefault;
  writeFile?: typeof writeFileDefault;
  generatedAt?: Date;
};

function compactTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function parsePositiveIntegerEnv(name: string, value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer. received=${value}`);
  }

  return parsed;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function resolveToken(env: WebVitalsRemoteEnv) {
  return (
    env.OPS_WEB_VITALS_INTERNAL_TOKEN?.trim() ??
    env.OPS_HEALTH_INTERNAL_TOKEN?.trim() ??
    env.HEALTH_INTERNAL_TOKEN?.trim() ??
    ""
  );
}

export function resolveRemoteWebVitalsOptions(env: WebVitalsRemoteEnv): WebVitalsRemoteOptions {
  const baseUrl = env.OPS_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("OPS_BASE_URL is required (example: https://townpet.example.com)");
  }

  const token = resolveToken(env);
  if (!token) {
    throw new Error(
      "OPS_WEB_VITALS_INTERNAL_TOKEN or OPS_HEALTH_INTERNAL_TOKEN is required for remote Web Vitals summary",
    );
  }

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    token,
    days: parsePositiveIntegerEnv("WEB_VITALS_REPORT_DAYS", env.WEB_VITALS_REPORT_DAYS, 7),
    limit: parsePositiveIntegerEnv("WEB_VITALS_REPORT_LIMIT", env.WEB_VITALS_REPORT_LIMIT, 5000),
    outputPath: path.resolve(
      env.WEB_VITALS_REPORT_OUT ??
        path.join("..", "docs", "reports", `web-vitals-remote-summary-${compactTimestamp()}.md`),
    ),
  };
}

export function buildRemoteWebVitalsSummaryUrl(options: Pick<WebVitalsRemoteOptions, "baseUrl" | "days" | "limit">) {
  const url = new URL(`${normalizeBaseUrl(options.baseUrl)}/api/ops/web-vitals/summary`);
  url.searchParams.set("days", String(options.days));
  url.searchParams.set("limit", String(options.limit));
  return url.toString();
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value < 10 ? value.toFixed(3).replace(/0+$/u, "").replace(/\.$/u, "") : Math.round(value).toString();
}

export function renderRemoteWebVitalsSummaryMarkdown(input: {
  generatedAt?: Date;
  baseUrl: string;
  summary: WebVitalsRemoteSummary;
}) {
  const { summary } = input;
  const lines = [
    "# Remote Web Vitals Summary",
    "",
    `- generatedAt: \`${(input.generatedAt ?? new Date()).toISOString()}\``,
    `- baseUrl: \`${input.baseUrl}\``,
    `- status: \`${summary.status}\``,
    `- days: \`${summary.days}\``,
    `- limit: \`${summary.limit}\``,
    `- schemaSyncRequired: \`${summary.schemaSyncRequired}\``,
    `- sampleCount: \`${summary.sampleCount}\``,
    "",
  ];

  if (summary.status === "SCHEMA_SYNC_REQUIRED") {
    lines.push(
      "## Result",
      "",
      "WebVitalSample table 또는 Prisma client가 production에서 아직 동기화되지 않았습니다.",
      "",
    );
    return lines.join("\n");
  }

  if (summary.status === "NO_SAMPLES") {
    lines.push("## Result", "", "최근 기간에 수집된 production Web Vitals sample이 없습니다.", "");
    return lines.join("\n");
  }

  lines.push(
    "## Metric Rows",
    "",
    "| metric | route | count | p75 | p95 | good | needs_improvement | poor | latestAt |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  );

  for (const row of summary.rows) {
    lines.push(
      `| ${row.metric} | \`${row.route}\` | ${row.count} | ${formatNumber(row.p75)} | ${formatNumber(row.p95)} | ${row.goodCount} | ${row.needsImprovementCount} | ${row.poorCount} | ${row.latestAt ?? "-"} |`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

export async function fetchRemoteWebVitalsSummary(
  options: WebVitalsRemoteOptions,
  fetchFn: typeof fetch = fetch,
) {
  const url = buildRemoteWebVitalsSummaryUrl(options);
  const response = await fetchFn(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      accept: "application/json",
      "cache-control": "no-cache",
      "x-health-token": options.token,
    },
  });

  let payload: WebVitalsRemoteResponse | null = null;
  try {
    payload = (await response.json()) as WebVitalsRemoteResponse;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok || !payload.data) {
    const code = payload?.error?.code ?? `HTTP_${response.status}`;
    const message = payload?.error?.message ?? "remote Web Vitals summary request failed";
    throw new Error(`Remote Web Vitals summary failed: ${code} ${message}`);
  }

  return payload.data;
}

export async function runRemoteWebVitalsSummaryCli(
  options: WebVitalsRemoteOptions = resolveRemoteWebVitalsOptions(process.env),
  deps: WebVitalsRemoteSummaryDeps = {},
): Promise<WebVitalsRemoteSummaryCliResult> {
  const summary = await fetchRemoteWebVitalsSummary(options, deps.fetchFn);
  const markdown = renderRemoteWebVitalsSummaryMarkdown({
    generatedAt: deps.generatedAt,
    baseUrl: options.baseUrl,
    summary,
  });

  const mkdir = deps.mkdir ?? mkdirDefault;
  const writeFile = deps.writeFile ?? writeFileDefault;
  await mkdir(path.dirname(options.outputPath), { recursive: true });
  await writeFile(options.outputPath, markdown, "utf8");

  return {
    summary,
    markdown,
    output: [
      "Remote Web Vitals summary fetched",
      `- url: ${buildRemoteWebVitalsSummaryUrl(options)}`,
      `- status: ${summary.status}`,
      `- sampleCount: ${summary.sampleCount}`,
      `- output: ${options.outputPath}`,
    ].join("\n"),
    exitCode: 0,
  };
}

export async function main(
  options: WebVitalsRemoteOptions = resolveRemoteWebVitalsOptions(process.env),
  deps: WebVitalsRemoteSummaryDeps = {},
) {
  const result = await runRemoteWebVitalsSummaryCli(options, deps);
  console.log(result.output);
  return result.output;
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("fetch-web-vitals-summary.ts")
) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
