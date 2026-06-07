import type { SearchTermContext } from "@/server/queries/search.queries";
import { getHealthSnapshot } from "@/server/health-overview";
import { getAdminQueueSmokeReadiness } from "@/server/queries/admin-queue-smoke-readiness.queries";
import {
  getCorrectionFlowOpsOverview,
  getLostFoundAcquisitionOpsOverview,
} from "@/server/queries/acquisition-ops.queries";
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
  const [
    health,
    authAudit,
    reports,
    careFeedbacks,
    personalization,
    search,
    initialRegion,
    correctionFlow,
    lostFoundAcquisition,
    adminQueueSmoke,
  ] =
    await Promise.all([
      getHealthSnapshot({ includeDetailedHealth: true }),
      getAuthAuditOverview(1),
      getReportStats(7),
      getCareFeedbackIssueStats(),
      getFeedPersonalizationOverview(7),
      getSearchInsightsOverview(8, options.searchContext),
      getInitialRegionOpsOverview(7),
      getCorrectionFlowOpsOverview(7),
      getLostFoundAcquisitionOpsOverview(7),
      getAdminQueueSmokeReadiness(),
    ]);

  return {
    health,
    authAudit,
    reports,
    careFeedbacks,
    personalization,
    search,
    initialRegion,
    correctionFlow,
    lostFoundAcquisition,
    adminQueueSmoke,
  };
}
