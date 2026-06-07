import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import {
  isDryRunMode,
  type MaintenanceRunMode,
  resolveMaintenanceRunMode,
} from "./maintenance-run-mode";

export const LEGACY_SITE_SETTING_KEYS = ["popular_search_terms_v1"] as const;

type LegacySiteSettingCleanupPrisma = Pick<
  PrismaClient,
  "siteSetting" | "$disconnect"
>;

type LegacySiteSettingRow = {
  key: string;
  updatedAt: Date;
};

export function formatLegacySiteSettingCleanupOutput(params: {
  mode: MaintenanceRunMode;
  legacyRows: LegacySiteSettingRow[];
  deletedCount?: number;
}) {
  if (params.legacyRows.length === 0) {
    return "No legacy SiteSetting keys found.";
  }

  const lines = [`Found ${params.legacyRows.length} legacy SiteSetting key(s):`];
  for (const row of params.legacyRows) {
    lines.push(`- ${row.key} (updatedAt=${row.updatedAt.toISOString()})`);
  }

  if (isDryRunMode(params.mode)) {
    lines.push("Dry-run mode. Re-run with --apply to delete keys.");
  } else {
    lines.push(`Deleted ${params.deletedCount ?? 0} legacy SiteSetting key(s).`);
  }

  return lines.join("\n");
}

export async function runLegacySiteSettingCleanup(
  prisma: LegacySiteSettingCleanupPrisma,
) {
  const mode = resolveMaintenanceRunMode({
    applyEnvName: "LEGACY_SITE_SETTING_CLEANUP_APPLY",
  });
  const keys = [...LEGACY_SITE_SETTING_KEYS];

  const legacyRows = await prisma.siteSetting.findMany({
    where: { key: { in: keys } },
    select: { key: true, updatedAt: true },
    orderBy: { key: "asc" },
  });

  if (legacyRows.length === 0 || isDryRunMode(mode)) {
    return formatLegacySiteSettingCleanupOutput({
      mode,
      legacyRows,
    });
  }

  const deleted = await prisma.siteSetting.deleteMany({
    where: { key: { in: keys } },
  });

  return formatLegacySiteSettingCleanupOutput({
    mode,
    legacyRows,
    deletedCount: deleted.count,
  });
}

async function main(prisma: LegacySiteSettingCleanupPrisma = new PrismaClient()) {
  console.log(await runLegacySiteSettingCleanup(prisma));
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("cleanup-legacy-site-setting.ts")
) {
  const prisma = new PrismaClient();
  main(prisma)
    .catch((error) => {
      console.error("Legacy SiteSetting cleanup failed", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
