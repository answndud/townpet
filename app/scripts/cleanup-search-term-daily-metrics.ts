import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import {
  cleanupSearchTermDailyMetrics,
  resolveSearchTermDailyMetricRetentionDays,
} from "@/server/search-term-daily-metric-retention";

const prisma = new PrismaClient();

async function main() {
  const retentionDays = resolveSearchTermDailyMetricRetentionDays();
  const result = await cleanupSearchTermDailyMetrics({
    delegate: prisma.searchTermDailyMetric,
    retentionDays,
  });

  console.log(
    `Deleted ${result.count} SearchTermDailyMetric rows older than ${result.cutoff.toISOString()}.`,
  );
}

main()
  .catch((error) => {
    console.error("Search term daily metric cleanup failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
