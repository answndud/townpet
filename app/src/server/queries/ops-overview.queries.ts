import type { SearchTermContext } from "@/server/queries/search.queries";
import { getHealthSnapshot } from "@/server/health-overview";
import { getAuthAuditOverview } from "@/server/queries/auth-audit.queries";
import { getFeedPersonalizationOverview } from "@/server/queries/feed-personalization-metrics.queries";
import { getReportStats } from "@/server/queries/report.queries";
import { getSearchInsightsOverview } from "@/server/queries/search.queries";

type AdminOpsOverviewOptions = {
  searchContext?: SearchTermContext;
};

export async function getAdminOpsOverview(options: AdminOpsOverviewOptions = {}) {
  const [health, authAudit, reports, personalization, search] = await Promise.all([
    getHealthSnapshot({ includeDetailedHealth: true }),
    getAuthAuditOverview(1),
    getReportStats(7),
    getFeedPersonalizationOverview(7),
    getSearchInsightsOverview(8, options.searchContext),
  ]);

  return {
    health,
    authAudit,
    reports,
    personalization,
    search,
  };
}
