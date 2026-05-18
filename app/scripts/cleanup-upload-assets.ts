import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import {
  cleanupTemporaryUploadAssets,
  resolveUploadTemporaryRetentionHours,
} from "../src/server/upload-asset.service";
import {
  formatMaintenanceMode,
  isDryRunMode,
  resolveMaintenanceRunMode,
} from "./maintenance-run-mode";

async function main() {
  const mode = resolveMaintenanceRunMode({
    applyEnvName: "UPLOAD_TEMP_CLEANUP_APPLY",
  });
  const retentionHours = resolveUploadTemporaryRetentionHours();
  const limit = Number(process.env.UPLOAD_TEMP_CLEANUP_LIMIT ?? 100);

  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("UPLOAD_TEMP_CLEANUP_LIMIT must be a positive number.");
  }

  const result = await cleanupTemporaryUploadAssets({
    retentionHours,
    limit,
    dryRun: isDryRunMode(mode),
  });

  console.log("Upload asset cleanup");
  console.log(`- mode: ${formatMaintenanceMode(mode)}`);
  console.log(`- retentionHours: ${retentionHours}`);
  console.log(`- scanned: ${result.scannedCount}`);
  console.log(`- ${isDryRunMode(mode) ? "wouldDelete" : "deleted"}: ${result.deletedCount}`);
  console.log(`- skipped: ${result.skippedCount}`);
  console.log(`- cutoff: ${result.cutoff.toISOString()}`);
  if (isDryRunMode(mode)) {
    console.log("Dry-run mode. Re-run with --apply to delete upload assets.");
  }
}

main()
  .catch((error) => {
    console.error("Upload asset cleanup failed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
