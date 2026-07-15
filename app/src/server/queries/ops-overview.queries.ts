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
import { getNotificationDeliveryOutboxStats } from "@/server/queries/notifications/notification.queries";
import { logger, serializeError } from "@/server/logger";

type AdminOpsOverviewOptions = {
  searchContext?: SearchTermContext;
};

async function getNotificationDeliveryOpsOverview() {
  try {
    const stats = await getNotificationDeliveryOutboxStats();
    return {
      ...stats,
      schemaSyncRequired: false,
    };
  } catch (error) {
    logger.warn("알림 delivery outbox 운영 지표를 읽지 못했습니다.", {
      error: serializeError(error),
    });
    return {
      pending: 0,
      failed: 0,
      deadLetter: 0,
      due: 0,
      oldestDueAt: null,
      oldestDueAgeSeconds: 0,
      checkedAt: new Date(),
      schemaSyncRequired: true,
    };
  }
}

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
    notificationDelivery,
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
      getNotificationDeliveryOpsOverview(),
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
    notificationDelivery,
  };
}
