import "dotenv/config";

import { PostStatus } from "@prisma/client";

import type {
  ArchiveInvalidNotificationTargetsResult,
  RecountPostEngagementCountsResult,
  RepairDeletedPostIntegrityResult,
} from "../src/server/post-integrity.service";
import { isDryRunMode, resolveMaintenanceRunMode } from "./maintenance-run-mode";

type PostIntegrityRepairDeps = {
  archiveInvalidNotificationTargets(params: {
    dryRun: boolean;
    limit?: number;
  }): Promise<ArchiveInvalidNotificationTargetsResult>;
  repairDeletedPostIntegrity(params: {
    dryRun: boolean;
    limit?: number;
  }): Promise<RepairDeletedPostIntegrityResult>;
  recountPostEngagementCounts(params: {
    dryRun: boolean;
    limit?: number;
    scope: PostStatus | "ALL";
  }): Promise<RecountPostEngagementCountsResult>;
  bumpPresentationCaches(): Promise<void>;
  bumpNotificationCaches(userIds: string[]): Promise<void>;
};

type PostIntegrityRepairConfig = {
  dryRun: boolean;
  deletedPostLimit?: number;
  notificationLimit?: number;
  recountLimit?: number;
  recountScope: PostStatus | "ALL";
};

type PostIntegrityRepairResult = {
  dryRun: boolean;
  recountScope: PostStatus | "ALL";
  deletedPostRepair: RepairDeletedPostIntegrityResult;
  invalidNotificationRepair: ArchiveInvalidNotificationTargetsResult;
  countRecount: RecountPostEngagementCountsResult;
};

export function parseOptionalPositiveInteger(
  rawValue: string | undefined,
  envName: string,
): number | undefined {
  if (!rawValue || rawValue.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${envName} must be a positive number when provided.`);
  }

  return Math.floor(parsed);
}

export function parseRepairScope(rawValue: string | undefined): PostStatus | "ALL" {
  const normalized = rawValue?.trim().toUpperCase();
  if (!normalized || normalized === "ALL") {
    return "ALL";
  }

  if (normalized === PostStatus.ACTIVE) {
    return PostStatus.ACTIVE;
  }
  if (normalized === PostStatus.HIDDEN) {
    return PostStatus.HIDDEN;
  }
  if (normalized === PostStatus.DELETED) {
    return PostStatus.DELETED;
  }

  throw new Error("POST_COUNT_REPAIR_SCOPE must be one of ALL, ACTIVE, HIDDEN, DELETED.");
}

export async function bumpPostIntegrityNotificationCaches(
  bumpNotificationUnreadCacheVersion: (userId: string) => Promise<unknown>,
  bumpNotificationListCacheVersion: (userId: string) => Promise<unknown>,
  userIds: string[],
) {
  const dedupedUserIds = Array.from(new Set(userIds.filter((value) => value.trim().length > 0)));
  await Promise.all(
    dedupedUserIds.flatMap((userId) => [
      bumpNotificationUnreadCacheVersion(userId),
      bumpNotificationListCacheVersion(userId),
    ]),
  );
}

export function resolvePostIntegrityRepairConfig(
  env: NodeJS.ProcessEnv = process.env,
): PostIntegrityRepairConfig {
  return {
    dryRun: isDryRunMode(
      resolveMaintenanceRunMode({
        dryRunEnvName: "POST_INTEGRITY_REPAIR_DRY_RUN",
        applyEnvName: "POST_INTEGRITY_REPAIR_APPLY",
      }),
    ),
    deletedPostLimit: parseOptionalPositiveInteger(
      env.POST_INTEGRITY_DELETED_POST_LIMIT,
      "POST_INTEGRITY_DELETED_POST_LIMIT",
    ),
    notificationLimit: parseOptionalPositiveInteger(
      env.POST_INTEGRITY_NOTIFICATION_LIMIT,
      "POST_INTEGRITY_NOTIFICATION_LIMIT",
    ),
    recountLimit: parseOptionalPositiveInteger(
      env.POST_COUNT_REPAIR_LIMIT,
      "POST_COUNT_REPAIR_LIMIT",
    ),
    recountScope: parseRepairScope(env.POST_COUNT_REPAIR_SCOPE),
  };
}

export function formatPostIntegrityRepairOutput(result: PostIntegrityRepairResult) {
  const { dryRun, recountScope, deletedPostRepair, invalidNotificationRepair, countRecount } =
    result;

  return [
    "Post integrity repair",
    `- dryRun: ${dryRun ? "yes" : "no"}`,
    `- deletedPosts.scanned: ${deletedPostRepair.scannedPosts}`,
    `- deletedPosts.repaired: ${deletedPostRepair.repairedPosts}`,
    `- deletedPosts.activeCommentsSoftDeleted: ${deletedPostRepair.activeCommentsSoftDeleted}`,
    `- deletedPosts.commentReactionsRemoved: ${deletedPostRepair.commentReactionsRemoved}`,
    `- deletedPosts.postReactionsRemoved: ${deletedPostRepair.postReactionsRemoved}`,
    `- deletedPosts.bookmarksRemoved: ${deletedPostRepair.bookmarksRemoved}`,
    `- deletedPosts.notificationsArchived: ${deletedPostRepair.notificationsArchived}`,
    `- invalidNotifications.scanned: ${invalidNotificationRepair.scannedNotifications}`,
    `- invalidNotifications.archived: ${invalidNotificationRepair.archivedNotifications}`,
    `- recount.scope: ${recountScope}`,
    `- recount.scannedPosts: ${countRecount.scannedPosts}`,
    `- recount.updatedPosts: ${countRecount.updatedPosts}`,
    `- recount.unchangedPosts: ${countRecount.unchangedPosts}`,
    `- recount.updatedCommentCounts: ${countRecount.updatedCommentCounts}`,
    `- recount.updatedLikeCounts: ${countRecount.updatedLikeCounts}`,
    `- recount.updatedDislikeCounts: ${countRecount.updatedDislikeCounts}`,
  ].join("\n");
}

export async function runPostIntegrityRepair(
  deps: PostIntegrityRepairDeps,
  config = resolvePostIntegrityRepairConfig(),
) {
  const deletedPostRepair = await deps.repairDeletedPostIntegrity({
    dryRun: config.dryRun,
    limit: config.deletedPostLimit,
  });
  const invalidNotificationRepair = await deps.archiveInvalidNotificationTargets({
    dryRun: config.dryRun,
    limit: config.notificationLimit,
  });
  const countRecount = await deps.recountPostEngagementCounts({
    dryRun: config.dryRun,
    limit: config.recountLimit,
    scope: config.recountScope,
  });

  if (!config.dryRun) {
    await deps.bumpPresentationCaches();
    await deps.bumpNotificationCaches([
      ...deletedPostRepair.affectedNotificationUserIds,
      ...invalidNotificationRepair.affectedUserIds,
    ]);
  }

  return formatPostIntegrityRepairOutput({
    dryRun: config.dryRun,
    recountScope: config.recountScope,
    deletedPostRepair,
    invalidNotificationRepair,
    countRecount,
  });
}

async function main() {
  const [
    { prisma },
    queryCache,
    {
      archiveInvalidNotificationTargets,
      recountPostEngagementCounts,
      repairDeletedPostIntegrity,
    },
  ] = await Promise.all([
    import("../src/lib/prisma"),
    import("../src/server/cache/query-cache"),
    import("../src/server/post-integrity.service"),
  ]);

  try {
    console.log(
      await runPostIntegrityRepair({
        archiveInvalidNotificationTargets,
        repairDeletedPostIntegrity,
        recountPostEngagementCounts,
        bumpPresentationCaches: async () => {
          await Promise.all([
            queryCache.bumpFeedCacheVersion(),
            queryCache.bumpSearchCacheVersion(),
            queryCache.bumpSuggestCacheVersion(),
            queryCache.bumpPostDetailCacheVersion(),
            queryCache.bumpPostCommentsCacheVersion(),
          ]);
        },
        bumpNotificationCaches: async (userIds) => {
          await bumpPostIntegrityNotificationCaches(
            queryCache.bumpNotificationUnreadCacheVersion,
            queryCache.bumpNotificationListCacheVersion,
            userIds,
          );
        },
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("repair-post-integrity.ts")
) {
  main().catch((error) => {
    console.error("Post integrity repair failed");
    console.error(error);
    process.exit(1);
  });
}
