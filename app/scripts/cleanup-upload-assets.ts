import "dotenv/config";

import {
  formatMaintenanceMode,
  isDryRunMode,
  type MaintenanceRunMode,
  resolveMaintenanceRunMode,
} from "./maintenance-run-mode";

type UploadAssetCleanupResult = {
  cutoff: Date;
  scannedCount: number;
  deletedCount: number;
  skippedCount: number;
};

type UploadAssetCleanupDeps = {
  cleanupTemporaryUploadAssets(params: {
    retentionHours: number;
    limit: number;
    dryRun: boolean;
  }): Promise<UploadAssetCleanupResult>;
  resolveUploadTemporaryRetentionHours(): number;
};

export function resolveUploadTempCleanupLimit(
  raw = process.env.UPLOAD_TEMP_CLEANUP_LIMIT,
) {
  const limit = Number(raw ?? 100);

  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("UPLOAD_TEMP_CLEANUP_LIMIT must be a positive number.");
  }

  return limit;
}

export function formatUploadAssetCleanupOutput(params: {
  mode: MaintenanceRunMode;
  retentionHours: number;
  result: UploadAssetCleanupResult;
}) {
  const { mode, retentionHours, result } = params;
  const lines = [
    "Upload asset cleanup",
    `- mode: ${formatMaintenanceMode(mode)}`,
    `- retentionHours: ${retentionHours}`,
    `- scanned: ${result.scannedCount}`,
    `- ${isDryRunMode(mode) ? "wouldDelete" : "deleted"}: ${result.deletedCount}`,
    `- skipped: ${result.skippedCount}`,
    `- cutoff: ${result.cutoff.toISOString()}`,
  ];

  if (isDryRunMode(mode)) {
    lines.push("Dry-run mode. Re-run with --apply to delete upload assets.");
  }

  return lines.join("\n");
}

export async function runUploadAssetCleanup(deps: UploadAssetCleanupDeps) {
  const mode = resolveMaintenanceRunMode({
    applyEnvName: "UPLOAD_TEMP_CLEANUP_APPLY",
  });
  const retentionHours = deps.resolveUploadTemporaryRetentionHours();
  const limit = resolveUploadTempCleanupLimit();

  const result = await deps.cleanupTemporaryUploadAssets({
    retentionHours,
    limit,
    dryRun: isDryRunMode(mode),
  });

  return formatUploadAssetCleanupOutput({
    mode,
    retentionHours,
    result,
  });
}

async function main() {
  const [{ cleanupTemporaryUploadAssets, resolveUploadTemporaryRetentionHours }, { prisma }] =
    await Promise.all([
      import("../src/server/upload-asset.service"),
      import("../src/lib/prisma"),
    ]);

  try {
    console.log(
      await runUploadAssetCleanup({
        cleanupTemporaryUploadAssets,
        resolveUploadTemporaryRetentionHours,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("cleanup-upload-assets.ts")
) {
  main().catch((error) => {
    console.error("Upload asset cleanup failed");
    console.error(error);
    process.exit(1);
  });
}
