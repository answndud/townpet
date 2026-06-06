import "dotenv/config";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

type HeaderSnapshot = {
  label: string;
  path: string;
  status: number;
  xVercelId: string;
  xVercelCache: string;
  cacheControl: string;
  vary: string;
};

type DatabaseUrlSummary = {
  configured: boolean;
  protocol: string | null;
  host: string | null;
  database: string | null;
  usesPoolingHost: boolean;
  poolingSignals: string[];
};

type QuerySurface = {
  id: string;
  label: string;
  expectedIndexSignals: string[];
  riskIfSlow: string;
  nextExplain: string;
};

type DbReadinessTarget = {
  label: string;
  path: string;
};

type DbReadinessEnv = Partial<Record<string, string | undefined>>;

const DEFAULT_BASE_URL = "https://townpet.vercel.app";
const CURRENT_FILE_PATH = fileURLToPath(import.meta.url);

export const DB_READINESS_QUERY_SURFACES: QuerySurface[] = [
  {
    id: "feed_latest_global",
    label: "feed latest GLOBAL first page",
    expectedIndexSignals: ["Post_scope_status_createdAt_idx"],
    riskIfSlow: "GLOBAL 최신글 목록이 sequential scan 또는 sort로 떨어질 수 있다.",
    nextExplain:
      'EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM "Post" WHERE "scope" = \'GLOBAL\' AND "status" = \'ACTIVE\' ORDER BY "createdAt" DESC LIMIT 21;',
  },
  {
    id: "feed_best_global",
    label: "feed best GLOBAL first page",
    expectedIndexSignals: ["Post_scope_status_best_order_idx"],
    riskIfSlow: "베스트글 정렬이 like/comment/view/createdAt sort 비용으로 커질 수 있다.",
    nextExplain:
      'EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM "Post" WHERE "scope" = \'GLOBAL\' AND "status" = \'ACTIVE\' ORDER BY "likeCount" DESC, "commentCount" DESC, "viewCount" DESC, "createdAt" DESC, "id" DESC LIMIT 21;',
  },
  {
    id: "feed_local_type",
    label: "local board/type feed",
    expectedIndexSignals: ["@@index([neighborhoodId, type, status, createdAt(sort: Desc)])"],
    riskIfSlow: "지역+게시판 조합에서 neighborhood/type 필터 후 정렬 비용이 커질 수 있다.",
    nextExplain:
      'EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM "Post" WHERE "neighborhoodId" = $1 AND "type" = $2 AND "status" = \'ACTIVE\' ORDER BY "createdAt" DESC LIMIT 21;',
  },
  {
    id: "ranked_search",
    label: "ranked search title/content/structured text",
    expectedIndexSignals: [
      "Post_title_trgm_idx",
      "Post_content_trgm_idx",
      "Post_structuredSearchText_trgm_idx",
      "Post_structuredSearchText_tsv_idx",
    ],
    riskIfSlow: "pg_trgm/GIN이 없거나 LIKE 패턴이 index를 타지 못하면 검색이 가장 먼저 병목이 된다.",
    nextExplain:
      'EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM "Post" WHERE "status" = \'ACTIVE\' AND ("title" ILIKE $1 OR "content" ILIKE $1 OR "structuredSearchText" ILIKE $1) LIMIT 80;',
  },
  {
    id: "comments_detail",
    label: "post detail comments",
    expectedIndexSignals: ["@@index([postId, createdAt(sort: Desc)])"],
    riskIfSlow: "상세 댓글 페이지가 postId 필터 후 createdAt 정렬에서 느려질 수 있다.",
    nextExplain:
      'EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM "Comment" WHERE "postId" = $1 ORDER BY "createdAt" DESC LIMIT 51;',
  },
  {
    id: "report_queue",
    label: "admin report queue",
    expectedIndexSignals: ["Report_status_targetType_createdAt_idx"],
    riskIfSlow: "운영 큐 count/list가 신고 누적 후 관리자 화면 병목이 될 수 있다.",
    nextExplain:
      'EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM "Report" WHERE "status" = \'PENDING\' AND "targetType" IN (\'POST\', \'COMMENT\') ORDER BY "createdAt" DESC, "id" DESC LIMIT 25;',
  },
];

function resolveRepoRoot() {
  return path.basename(process.cwd()) === "app" ? path.resolve(process.cwd(), "..") : process.cwd();
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function compactTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function summarizeDatabaseUrl(rawUrl: string | undefined): DatabaseUrlSummary {
  if (!rawUrl?.trim()) {
    return {
      configured: false,
      protocol: null,
      host: null,
      database: null,
      usesPoolingHost: false,
      poolingSignals: [],
    };
  }

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname;
    const database = parsed.pathname.replace(/^\/+/, "") || null;
    const signalChecks = [
      ["pooler", host.includes("pooler")],
      ["pool", host.includes("pool")],
      ["pgbouncer", host.includes("pgbouncer")],
      ["neon-host", host.endsWith(".neon.tech")],
    ] as const;
    const poolingSignals = signalChecks
      .filter(([, matched]) => matched)
      .map(([label]) => label);

    return {
      configured: true,
      protocol: parsed.protocol.replace(/:$/, ""),
      host,
      database,
      usesPoolingHost: poolingSignals.some((signal) => signal !== "neon-host"),
      poolingSignals,
    };
  } catch {
    return {
      configured: true,
      protocol: "unparseable",
      host: null,
      database: null,
      usesPoolingHost: false,
      poolingSignals: ["invalid-url"],
    };
  }
}

export function hasIndexSignal(schemaAndMigrations: string, signal: string) {
  return schemaAndMigrations.includes(signal);
}

export function parseVercelIdRegions(xVercelId: string) {
  return xVercelId
    .split("::")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.split("-")[0])
    .filter(Boolean);
}

function buildDefaultHeaderTargets(): DbReadinessTarget[] {
  return [
    { label: "home", path: "/" },
    { label: "guest_feed_page", path: "/feed/guest" },
    {
      label: "guest_feed_api",
      path: "/api/feed/guest?mode=ALL&sort=LATEST&page=1",
    },
    { label: "health", path: "/api/health" },
  ];
}

export function parseDbReadinessTargetFilter(value: string | undefined) {
  if (!value) {
    return [];
  }

  return [...new Set(value.split(",").map((label) => label.trim()).filter(Boolean))];
}

export function filterDbReadinessHeaderTargets(
  targets: DbReadinessTarget[],
  targetFilterValue: string | undefined,
) {
  const requestedLabels = parseDbReadinessTargetFilter(targetFilterValue);
  if (requestedLabels.length === 0) {
    return targets;
  }

  const targetByLabel = new Map(targets.map((target) => [target.label, target]));
  const unknownLabels = requestedLabels.filter((label) => !targetByLabel.has(label));
  if (unknownLabels.length > 0) {
    throw new Error(
      `PERF_DB_TARGETS contains unknown target(s): ${unknownLabels.join(", ")}. available=${targets.map((target) => target.label).join(",")}`,
    );
  }

  return requestedLabels.map((label) => targetByLabel.get(label)!);
}

export function buildDbReadinessHeaderTargets(env: DbReadinessEnv) {
  return filterDbReadinessHeaderTargets(buildDefaultHeaderTargets(), env.PERF_DB_TARGETS);
}

async function collectHeaderSnapshot(baseUrl: string, target: { label: string; path: string }) {
  const response = await fetch(`${baseUrl}${target.path}`, {
    method: "GET",
    redirect: "manual",
  });

  return {
    label: target.label,
    path: target.path,
    status: response.status,
    xVercelId: response.headers.get("x-vercel-id") ?? "",
    xVercelCache: response.headers.get("x-vercel-cache") ?? "",
    cacheControl: response.headers.get("cache-control") ?? "",
    vary: response.headers.get("vary") ?? "",
  } satisfies HeaderSnapshot;
}

function formatBoolean(value: boolean) {
  return value ? "yes" : "no";
}

function renderMarkdown(params: {
  generatedAt: string;
  baseUrl: string;
  databaseUrl: DatabaseUrlSummary;
  headers: HeaderSnapshot[];
  schemaAndMigrations: string;
}) {
  const lines = [
    "# DB Region, Pooling, Query Index Readiness",
    "",
    `- generatedAt: \`${params.generatedAt}\``,
    `- baseUrl: \`${params.baseUrl}\``,
    "",
    "## Current Process DB URL (Redacted)",
    "",
    "| item | value |",
    "| --- | --- |",
    `| DATABASE_URL configured | ${formatBoolean(params.databaseUrl.configured)} |`,
    `| protocol | ${params.databaseUrl.protocol ?? "-"} |`,
    `| host | ${params.databaseUrl.host ?? "-"} |`,
    `| database | ${params.databaseUrl.database ?? "-"} |`,
    `| pooling host signal | ${formatBoolean(params.databaseUrl.usesPoolingHost)} |`,
    `| pooling signals | ${params.databaseUrl.poolingSignals.join(", ") || "-"} |`,
    "",
    "Note: this report never prints credentials. The DB URL shown here is the current process environment, not necessarily production unless the script is run with production env. Provider region must still be confirmed in the DB dashboard.",
    "",
    "## Production Header Region Signals",
    "",
    "| route | status | x-vercel-cache | x-vercel-id | parsed regions | cache-control |",
    "| --- | ---: | --- | --- | --- | --- |",
  ];

  for (const header of params.headers) {
    lines.push(
      `| \`${header.path}\` | ${header.status} | ${header.xVercelCache || "-"} | \`${header.xVercelId || "-"}\` | ${parseVercelIdRegions(header.xVercelId).join(" -> ") || "-"} | \`${header.cacheControl || "-"}\` |`,
    );
  }

  lines.push(
    "",
    "## Query / Index Coverage",
    "",
    "| surface | coverage | expected index signals | risk if slow | next live EXPLAIN |",
    "| --- | --- | --- | --- | --- |",
  );

  for (const surface of DB_READINESS_QUERY_SURFACES) {
    const missingSignals = surface.expectedIndexSignals.filter(
      (signal) => !hasIndexSignal(params.schemaAndMigrations, signal),
    );
    const coverage = missingSignals.length === 0 ? "covered" : `missing: ${missingSignals.join(", ")}`;
    lines.push(
      `| ${surface.label} | ${coverage} | ${surface.expectedIndexSignals.map((signal) => `\`${signal}\``).join("<br>")} | ${surface.riskIfSlow} | \`${surface.nextExplain.replaceAll("|", "\\|")}\` |`,
    );
  }

  lines.push(
    "",
    "## Slow Query Top 5 Candidates",
    "",
    "1. `ranked_search`: trigram/GIN과 candidate hydration이 같이 걸리는 경로라 데이터가 쌓일수록 가장 먼저 p95가 커질 수 있다.",
    "2. `feed_best_global`: 복합 best order index가 있어도 기간 필터와 excluded type 조건이 붙으면 정렬/필터 비용을 EXPLAIN으로 확인해야 한다.",
    "3. `feed_latest_global`: 첫 페이지 count는 줄였지만 2페이지 이상과 조합 필터는 count/list 계획을 별도로 봐야 한다.",
    "4. `comments_detail`: index는 있으나 댓글이 많은 글에서 페이지 방향과 정렬 방향을 확인해야 한다.",
    "5. `report_queue`: 관리자 큐는 운영 데이터가 누적될 때 count/list 동시 실행 비용이 커질 수 있다.",
    "",
    "## Decision",
    "",
    "- Vercel runtime signal is visible in `x-vercel-id`; DB provider region is not inferable from code and must be confirmed in provider dashboard.",
    "- If DB region differs from the Vercel runtime region, align regions or use the provider's serverless pooler before adding more indexes.",
    "- If regions are aligned, run the listed `EXPLAIN (ANALYZE, BUFFERS)` statements against production-like data before creating migrations.",
  );

  return `${lines.join("\n")}\n`;
}

async function main() {
  const repoRoot = resolveRepoRoot();
  const appRoot = path.join(repoRoot, "app");
  const generatedAt = new Date().toISOString();
  const timestamp = compactTimestamp(new Date(generatedAt));
  const outDir = path.join(repoRoot, "docs", "reports");
  const mdOut = process.env.PERF_DB_OUT
    ? path.resolve(process.env.PERF_DB_OUT)
    : path.join(outDir, `performance-db-readiness-${timestamp}.md`);
  const jsonOut = process.env.PERF_DB_JSON_OUT
    ? path.resolve(process.env.PERF_DB_JSON_OUT)
    : path.join(outDir, `performance-db-readiness-${timestamp}.json`);
  const baseUrl = normalizeBaseUrl(process.env.PERF_BASE_URL ?? DEFAULT_BASE_URL);
  const schema = await readFile(path.join(appRoot, "prisma", "schema.prisma"), "utf8");
  const migrationFiles = await readFile(
    path.join(appRoot, "prisma", "migrations", "20260219173000_add_search_indexes", "migration.sql"),
    "utf8",
  ).then(async (searchIndexes) => {
    const structuredSearch = await readFile(
      path.join(appRoot, "prisma", "migrations", "20260312101500_add_post_structured_search_text", "migration.sql"),
      "utf8",
    );
    return `${searchIndexes}\n${structuredSearch}`;
  });
  const schemaAndMigrations = `${schema}\n${migrationFiles}`;
  const headerTargets = buildDbReadinessHeaderTargets(process.env);
  const headers = await Promise.all(
    headerTargets.map((target) => collectHeaderSnapshot(baseUrl, target)),
  );
  const databaseUrl = summarizeDatabaseUrl(process.env.DATABASE_URL);
  const payload = {
    generatedAt,
    baseUrl,
    databaseUrl,
    headers,
    querySurfaces: DB_READINESS_QUERY_SURFACES.map((surface) => ({
      ...surface,
      missingIndexSignals: surface.expectedIndexSignals.filter(
        (signal) => !hasIndexSignal(schemaAndMigrations, signal),
      ),
    })),
  };

  await mkdir(path.dirname(mdOut), { recursive: true });
  await mkdir(path.dirname(jsonOut), { recursive: true });
  await writeFile(jsonOut, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(
    mdOut,
    renderMarkdown({
      generatedAt,
      baseUrl,
      databaseUrl,
      headers,
      schemaAndMigrations,
    }),
    "utf8",
  );

  console.log(`Wrote ${path.relative(repoRoot, mdOut)}`);
  console.log(`Wrote ${path.relative(repoRoot, jsonOut)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === CURRENT_FILE_PATH) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
