import "dotenv/config";

import { Prisma, PrismaClient } from "@prisma/client";

import { getUploadProxyPath } from "../src/lib/upload-url";
import { assertDatabaseAccess } from "../src/server/local-database-guard";
import {
  DEFAULT_LEGACY_UPLOAD_PATH_AUDIT_LIMIT,
  LEGACY_DOUBLE_MEDIA_UPLOAD_PATTERN,
} from "./audit-legacy-upload-paths";

export const LEGACY_UPLOAD_PATH_CLEANUP_DRY_RUN_CONFIRM_ENV_KEY =
  "LEGACY_UPLOAD_PATH_CLEANUP_DRY_RUN_CONFIRM";
export const LEGACY_UPLOAD_PATH_CLEANUP_DRY_RUN_CONFIRM_VALUE =
  "LEGACY_UPLOAD_PATH_CLEANUP_DRY_RUN";

const LEGACY_UPLOAD_URL_REGEX = /\/media\/(?:media\/)+uploads\/[^\s)"'<>]+/gi;

type CandidatePost = {
  id: string;
  title: string;
  status: string;
  type: string;
  scope: string;
  content: string;
};

export type LegacyUploadPathReplacement = {
  before: string;
  after: string;
  occurrences: number;
};

export type LegacyUploadPathCleanupPreview = {
  postId: string;
  title: string;
  status: string;
  type: string;
  scope: string;
  replacements: LegacyUploadPathReplacement[];
  beforeSnippet: string;
  afterSnippet: string;
  updatedContent: string;
};

export type LegacyUploadPathCleanupDryRunResult = {
  generatedAt: string;
  mode: "dry-run";
  pattern: string;
  limit: number;
  candidateCount: number;
  changedCount: number;
  previews: LegacyUploadPathCleanupPreview[];
};

function containsLegacyUploadPathFilter() {
  return {
    contains: LEGACY_DOUBLE_MEDIA_UPLOAD_PATTERN,
    mode: Prisma.QueryMode.insensitive,
  };
}

export function normalizeLegacyUploadPathCleanupLimit(value: string | undefined) {
  if (!value) {
    return DEFAULT_LEGACY_UPLOAD_PATH_AUDIT_LIMIT;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
    throw new Error("LEGACY_UPLOAD_PATH_CLEANUP_DRY_RUN_LIMIT must be an integer from 1 to 100.");
  }

  return parsed;
}

function truncate(value: string, maxLength = 180) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

function countOccurrences(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

export function buildLegacyUploadPathReplacementPlan(content: string) {
  const matches = content.match(LEGACY_UPLOAD_URL_REGEX) ?? [];
  if (matches.length === 0) {
    return null;
  }

  const replacementsByBefore = new Map<string, string>();
  for (const match of matches) {
    const canonical = getUploadProxyPath(match);
    if (!canonical || canonical === match) {
      continue;
    }
    replacementsByBefore.set(match, canonical);
  }

  if (replacementsByBefore.size === 0) {
    return null;
  }

  let updatedContent = content;
  for (const [before, after] of replacementsByBefore.entries()) {
    updatedContent = updatedContent.split(before).join(after);
  }

  const matchCounts = countOccurrences(matches);
  return {
    updatedContent,
    replacements: Array.from(replacementsByBefore.entries()).map(([before, after]) => ({
      before,
      after,
      occurrences: matchCounts.get(before) ?? 0,
    })),
  };
}

export function buildLegacyUploadPathCleanupPreview(
  post: CandidatePost,
): LegacyUploadPathCleanupPreview | null {
  const plan = buildLegacyUploadPathReplacementPlan(post.content);
  if (!plan) {
    return null;
  }

  return {
    postId: post.id,
    title: post.title,
    status: post.status,
    type: post.type,
    scope: post.scope,
    replacements: plan.replacements,
    beforeSnippet: truncate(post.content),
    afterSnippet: truncate(plan.updatedContent),
    updatedContent: plan.updatedContent,
  };
}

export function formatLegacyUploadPathCleanupDryRunReport(
  result: LegacyUploadPathCleanupDryRunResult,
) {
  const lines = [
    "# Legacy Upload Path Cleanup Dry Run",
    "",
    `- generatedAt: ${result.generatedAt}`,
    `- mode: ${result.mode}`,
    `- pattern: ${result.pattern}`,
    `- limit: ${result.limit}`,
    `- candidateCount: ${result.candidateCount}`,
    `- changedCount: ${result.changedCount}`,
    "",
    "## Preview",
  ];

  if (result.previews.length === 0) {
    lines.push("- No cleanup candidates.");
  }

  for (const preview of result.previews) {
    lines.push("");
    lines.push(`### ${preview.postId}`);
    lines.push(`- title: ${preview.title}`);
    lines.push(`- status/type/scope: ${preview.status}/${preview.type}/${preview.scope}`);
    lines.push("- replacements:");
    for (const replacement of preview.replacements) {
      lines.push(
        `  - ${replacement.before} -> ${replacement.after} (occurrences=${replacement.occurrences})`,
      );
    }
    lines.push(`- beforeSnippet: ${preview.beforeSnippet}`);
    lines.push(`- afterSnippet: ${preview.afterSnippet}`);
  }

  lines.push("");
  lines.push("## Next Step");
  lines.push("- This is a dry-run report. No production data was changed.");
  lines.push("- Apply must be a separate explicit production mutation step after approval.");

  return `${lines.join("\n")}\n`;
}

async function runDryRun() {
  assertDatabaseAccess({
    confirmEnvKey: LEGACY_UPLOAD_PATH_CLEANUP_DRY_RUN_CONFIRM_ENV_KEY,
    confirmValue: LEGACY_UPLOAD_PATH_CLEANUP_DRY_RUN_CONFIRM_VALUE,
    operationLabel: "legacy upload path cleanup dry-run",
  });

  const limit = normalizeLegacyUploadPathCleanupLimit(
    process.env.LEGACY_UPLOAD_PATH_CLEANUP_DRY_RUN_LIMIT,
  );
  const prisma = new PrismaClient();

  try {
    const where = {
      content: containsLegacyUploadPathFilter(),
    };
    const [candidateCount, candidates] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          title: true,
          status: true,
          type: true,
          scope: true,
          content: true,
        },
      }),
    ]);

    const previews = candidates
      .map((post) => buildLegacyUploadPathCleanupPreview(post))
      .filter((preview): preview is LegacyUploadPathCleanupPreview => Boolean(preview));

    const result: LegacyUploadPathCleanupDryRunResult = {
      generatedAt: new Date().toISOString(),
      mode: "dry-run",
      pattern: LEGACY_DOUBLE_MEDIA_UPLOAD_PATTERN,
      limit,
      candidateCount,
      changedCount: previews.length,
      previews,
    };

    process.stdout.write(formatLegacyUploadPathCleanupDryRunReport(result));
  } finally {
    await prisma.$disconnect();
  }
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("dry-run-legacy-upload-path-cleanup.ts")
) {
  runDryRun().catch((error) => {
    console.error("Legacy upload path cleanup dry-run failed");
    console.error(error);
    process.exit(1);
  });
}
