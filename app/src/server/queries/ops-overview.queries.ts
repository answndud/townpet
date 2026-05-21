import type { SearchTermContext } from "@/server/queries/search.queries";
import { getHealthSnapshot } from "@/server/health-overview";
import { getAuthAuditOverview } from "@/server/queries/auth-audit.queries";
import { getCareFeedbackIssueStats } from "@/server/queries/care-feedback.queries";
import { getFeedPersonalizationOverview } from "@/server/queries/feed-personalization-metrics.queries";
import { getInitialRegionOpsOverview } from "@/server/queries/initial-region-ops.queries";
import { getReportStats } from "@/server/queries/report.queries";
import { getSearchInsightsOverview } from "@/server/queries/search.queries";

type AdminOpsOverviewOptions = {
  searchContext?: SearchTermContext;
};

export async function getAdminOpsOverview(options: AdminOpsOverviewOptions = {}) {
  const [health, authAudit, reports, careFeedbacks, personalization, search, initialRegion] =
    await Promise.all([
      getHealthSnapshot({ includeDetailedHealth: true }),
      getAuthAuditOverview(1),
      getReportStats(7),
      getCareFeedbackIssueStats(),
      getFeedPersonalizationOverview(7),
      getSearchInsightsOverview(8, options.searchContext),
      getInitialRegionOpsOverview(7),
    ]);

  return {
    health,
    authAudit,
    reports,
    careFeedbacks,
    personalization,
    search,
    initialRegion,
  };
}
