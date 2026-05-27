import "dotenv/config";

import { Prisma, PrismaClient } from "@prisma/client";

import { assertDatabaseAccess } from "../src/server/local-database-guard";
import {
  DEFAULT_LEGACY_UPLOAD_PATH_AUDIT_LIMIT,
  LEGACY_DOUBLE_MEDIA_UPLOAD_PATTERN,
} from "./audit-legacy-upload-paths";
import {
  buildLegacyUploadPathCleanupPreview,
  normalizeLegacyUploadPathCleanupLimit,
  type LegacyUploadPathCleanupPreview,
} from "./dry-run-legacy-upload-path-cleanup";

export const LEGACY_UPLOAD_PATH_CLEANUP_APPLY_CONFIRM_ENV_KEY =
  "LEGACY_UPLOAD_PATH_CLEANUP_APPLY_CONFIRM";
export const LEGACY_UPLOAD_PATH_CLEANUP_APPLY_CONFIRM_VALUE =
  "APPLY_LEGACY_UPLOAD_PATH_CLEANUP";

type CandidatePost = {
  id: string;
  title: string;
  status: string;
  type: string;
  scope: string;
  content: string;
};

type ApplyResultItem = LegacyUploadPathCleanupPreview & {
  applyStatus: "UPDATED" | "SKIPPED_STALE";
};

export type LegacyUploadPathCleanupApplyResult = {
  generatedAt: string;
  mode: "apply";
  pattern: string;
  limit: number;
  candidateCount: number;
  plannedCount: number;
  updatedCount: number;
  skippedStaleCount: number;
  items: ApplyResultItem[];
};

function containsLegacyUploadPathFilter() {
  return {
    contains: LEGACY_DOUBLE_MEDIA_UPLOAD_PATTERN,
    mode: Prisma.QueryMode.insensitive,
  };
}

export function formatLegacyUploadPathCleanupApplyReport(
  result: LegacyUploadPathCleanupApplyResult,
) {
  const lines = [
    "# Legacy Upload Path Cleanup Apply",
    "",
    `- generatedAt: ${result.generatedAt}`,
    `- mode: ${result.mode}`,
    `- pattern: ${result.pattern}`,
    `- limit: ${result.limit}`,
    `- candidateCount: ${result.candidateCount}`,
    `- plannedCount: ${result.plannedCount}`,
    `- updatedCount: ${result.updatedCount}`,
    `- skippedStaleCount: ${result.skippedStaleCount}`,
    "",
    "## Applied Items",
  ];

  if (result.items.length === 0) {
    lines.push("- No cleanup candidates.");
  }

  for (const item of result.items) {
    lines.push("");
    lines.push(`### ${item.postId}`);
    lines.push(`- applyStatus: ${item.applyStatus}`);
    lines.push(`- title: ${item.title}`);
    lines.push(`- status/type/scope: ${item.status}/${item.type}/${item.scope}`);
    lines.push("- replacements:");
    for (const replacement of item.replacements) {
      lines.push(
        `  - ${replacement.before} -> ${replacement.after} (occurrences=${replacement.occurrences})`,
      );
    }
    lines.push(`- beforeSnippet: ${item.beforeSnippet}`);
    lines.push(`- afterSnippet: ${item.afterSnippet}`);
  }

  lines.push("");
  lines.push("## Verification");
  lines.push("- Re-run `db:audit:legacy-upload-paths` after apply. Expected remaining count: 0.");

  return `${lines.join("\n")}\n`;
}

async function runApply() {
  assertDatabaseAccess({
    confirmEnvKey: LEGACY_UPLOAD_PATH_CLEANUP_APPLY_CONFIRM_ENV_KEY,
    confirmValue: LEGACY_UPLOAD_PATH_CLEANUP_APPLY_CONFIRM_VALUE,
    operationLabel: "legacy upload path cleanup apply",
  });

  const limit = normalizeLegacyUploadPathCleanupLimit(
    process.env.LEGACY_UPLOAD_PATH_CLEANUP_APPLY_LIMIT ?? String(DEFAULT_LEGACY_UPLOAD_PATH_AUDIT_LIMIT),
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

    const planned = candidates
      .map((post: CandidatePost) => ({
        post,
        preview: buildLegacyUploadPathCleanupPreview(post),
      }))
      .filter((entry): entry is { post: CandidatePost; preview: LegacyUploadPathCleanupPreview } =>
        Boolean(entry.preview),
      );

    const items: ApplyResultItem[] = [];
    for (const entry of planned) {
      const updateResult = await prisma.post.updateMany({
        where: {
          id: entry.post.id,
          content: entry.post.content,
        },
        data: {
          content: entry.preview.updatedContent,
        },
      });

      items.push({
        ...entry.preview,
        applyStatus: updateResult.count === 1 ? "UPDATED" : "SKIPPED_STALE",
      });
    }

    const result: LegacyUploadPathCleanupApplyResult = {
      generatedAt: new Date().toISOString(),
      mode: "apply",
      pattern: LEGACY_DOUBLE_MEDIA_UPLOAD_PATTERN,
      limit,
      candidateCount,
      plannedCount: planned.length,
      updatedCount: items.filter((item) => item.applyStatus === "UPDATED").length,
      skippedStaleCount: items.filter((item) => item.applyStatus === "SKIPPED_STALE").length,
      items,
    };

    process.stdout.write(formatLegacyUploadPathCleanupApplyReport(result));
  } finally {
    await prisma.$disconnect();
  }
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("apply-legacy-upload-path-cleanup.ts")
) {
  runApply().catch((error) => {
    console.error("Legacy upload path cleanup apply failed");
    console.error(error);
    process.exit(1);
  });
}
