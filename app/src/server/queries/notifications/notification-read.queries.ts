import { NotificationDeliveryStatus, NotificationType, Prisma } from "@prisma/client";

import type { NotificationFilterKind } from "@/lib/notification-filter";
import { prisma } from "@/lib/prisma";
import { createQueryCacheKey, withQueryCache } from "@/server/cache/query-cache";
import { logger } from "@/server/logger";
import { listHiddenAuthorIdsForViewer } from "@/server/queries/user-relation.queries";
import { assertSchemaDelegate, rethrowSchemaSyncRequired } from "@/server/schema-sync";

type NotificationListItem = Prisma.NotificationGetPayload<{
  include: {
    actor: {
      select: {
        id: true;
        nickname: true;
        image: true;
      };
    };
  };
}>;

type ListNotificationsByUserResult = {
  items: NotificationListItem[];
  nextCursor: string | null;
  page: number;
  totalPages: number;
  totalCount: number;
};

type NotificationDelegate = {
  findMany(args: Prisma.NotificationFindManyArgs): Promise<unknown[]>;
  count(args: Prisma.NotificationCountArgs): Promise<number>;
};

type NotificationDeliveryDelegate = {
  findFirst(args: Prisma.NotificationDeliveryFindFirstArgs): Promise<unknown>;
  findMany(args: Prisma.NotificationDeliveryFindManyArgs): Promise<unknown[]>;
  count(args: Prisma.NotificationDeliveryCountArgs): Promise<number>;
};

let missingDelegateWarned = false;
let missingDeliveryDelegateWarned = false;

function getNotificationDelegate() {
  const delegate = (prisma as unknown as { notification?: NotificationDelegate }).notification;
  if (!delegate && !missingDelegateWarned && process.env.NODE_ENV !== "test") {
    missingDelegateWarned = true;
    logger.warn("Prisma Client에 Notification 모델이 없어 알림 조회를 비활성화합니다.");
  }
  return delegate ?? null;
}

function getNotificationDeliveryDelegate() {
  const delegate = (
    prisma as unknown as { notificationDelivery?: NotificationDeliveryDelegate }
  ).notificationDelivery;
  if (!delegate && !missingDeliveryDelegateWarned && process.env.NODE_ENV !== "test") {
    missingDeliveryDelegateWarned = true;
    logger.warn("Prisma Client에 NotificationDelivery 모델이 없어 outbox 조회를 비활성화합니다.");
  }
  return delegate ?? null;
}

function requireNotificationDelegate() {
  return assertSchemaDelegate(
    getNotificationDelegate(),
    "Notification 모델이 누락되어 알림 기능을 사용할 수 없습니다. prisma generate 및 migrate deploy 후 다시 시도해 주세요.",
  );
}

function requireNotificationDeliveryDelegate() {
  return assertSchemaDelegate(
    getNotificationDeliveryDelegate(),
    "NotificationDelivery 모델이 누락되어 알림 outbox를 사용할 수 없습니다. prisma generate 및 migrate deploy 후 다시 시도해 주세요.",
  );
}

function throwNotificationSchemaSyncRequired(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
  }
  rethrowSchemaSyncRequired(
    error,
    "Notification 스키마가 누락되어 알림 기능을 사용할 수 없습니다. prisma generate 및 migrate deploy 후 다시 시도해 주세요.",
    { columns: ["Notification.archivedAt"] },
  );
}

function throwNotificationDeliverySchemaSyncRequired(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
  }
  rethrowSchemaSyncRequired(
    error,
    "NotificationDelivery 스키마가 누락되어 알림 outbox를 사용할 수 없습니다. prisma generate 및 migrate deploy 후 다시 시도해 주세요.",
    { columns: ["NotificationDelivery.status"] },
  );
}

function buildHiddenActorWhere(hiddenActorIds: string[]): Prisma.NotificationWhereInput {
  if (hiddenActorIds.length === 0) return {};
  return { OR: [{ actorId: null }, { actorId: { notIn: hiddenActorIds } }] };
}

export async function listNotificationsByUser({
  userId,
  limit = 20,
  cursor,
  page = 1,
  kind = "ALL",
  unreadOnly = false,
}: {
  userId: string;
  limit?: number;
  cursor?: string;
  page?: number;
  kind?: NotificationFilterKind;
  unreadOnly?: boolean;
}): Promise<ListNotificationsByUserResult> {
  const delegate = requireNotificationDelegate();
  const hiddenActorIds = await listHiddenAuthorIdsForViewer(userId);
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safePage = Math.max(page, 1);
  const typeFilter =
    kind === "COMMENT"
      ? [
          NotificationType.COMMENT_ON_POST,
          NotificationType.REPLY_TO_COMMENT,
          NotificationType.MENTION_IN_COMMENT,
        ]
      : kind === "REACTION"
        ? [NotificationType.REACTION_ON_POST, NotificationType.REACTION_ON_COMMENT]
        : kind === "SYSTEM"
          ? [NotificationType.SYSTEM]
          : null;
  const where: Prisma.NotificationWhereInput = {
    AND: [
      {
        userId,
        archivedAt: null,
        ...(unreadOnly ? { isRead: false } : {}),
        ...(typeFilter ? { type: { in: typeFilter } } : {}),
      },
      buildHiddenActorWhere(hiddenActorIds),
    ],
  };

  const fetchNotificationItems = async (): Promise<ListNotificationsByUserResult> => {
    let items: NotificationListItem[];
    let totalCount = 0;
    try {
      totalCount = await delegate.count({ where });
      const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));
      const resolvedPage = Math.min(safePage, totalPages);
      items = (await delegate.findMany({
        where,
        take: cursor ? safeLimit + 1 : safeLimit,
        ...(cursor
          ? { cursor: { id: cursor }, skip: 1 }
          : resolvedPage > 1
            ? { skip: (resolvedPage - 1) * safeLimit }
            : {}),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          actor: { select: { id: true, nickname: true, image: true } },
        },
      })) as NotificationListItem[];
    } catch (error) {
      throwNotificationSchemaSyncRequired(error);
    }

    let nextCursor: string | null = null;
    if (cursor && items.length > safeLimit) nextCursor = items.pop()?.id ?? null;
    const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));
    return {
      items,
      nextCursor,
      page: Math.min(safePage, totalPages),
      totalPages,
      totalCount,
    };
  };

  if (cursor || safePage > 1) return fetchNotificationItems();
  return withQueryCache({
    key: await createQueryCacheKey(`notification-list:${userId}`, {
      limit: safeLimit,
      kind,
      unreadOnly: unreadOnly ? "1" : "0",
      hiddenActorIds,
    }),
    ttlSeconds: 5,
    fetcher: fetchNotificationItems,
  });
}

export async function countUnreadNotifications(userId: string) {
  const delegate = requireNotificationDelegate();
  const hiddenActorIds = await listHiddenAuthorIdsForViewer(userId);
  const fetchUnreadCount = async () => {
    try {
      return await delegate.count({
        where: {
          AND: [
            { userId, archivedAt: null, isRead: false },
            buildHiddenActorWhere(hiddenActorIds),
          ],
        },
      });
    } catch (error) {
      throwNotificationSchemaSyncRequired(error);
    }
  };
  return withQueryCache({
    key: await createQueryCacheKey(`notification-unread:${userId}`, {
      type: "count",
      hiddenActorIds,
    }),
    ttlSeconds: 5,
    fetcher: fetchUnreadCount,
  });
}

export async function getNotificationDeliveryOutboxStats(now = new Date()) {
  const delegate = requireNotificationDeliveryDelegate();
  try {
    const [pending, failed, deadLetter, due, oldestDue] = await Promise.all([
      delegate.count({ where: { status: NotificationDeliveryStatus.PENDING } }),
      delegate.count({ where: { status: NotificationDeliveryStatus.FAILED } }),
      delegate.count({ where: { status: NotificationDeliveryStatus.DEAD_LETTER } }),
      delegate.count({
        where: {
          status: { in: [NotificationDeliveryStatus.PENDING, NotificationDeliveryStatus.FAILED] },
          scheduledAt: { lte: now },
        },
      }),
      delegate.findFirst({
        where: {
          status: { in: [NotificationDeliveryStatus.PENDING, NotificationDeliveryStatus.FAILED] },
          scheduledAt: { lte: now },
        },
        orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
        select: { scheduledAt: true },
      }),
    ]);
    const oldestDueAt = (oldestDue as { scheduledAt?: Date } | null)?.scheduledAt ?? null;
    return {
      pending,
      failed,
      deadLetter,
      due,
      oldestDueAt,
      oldestDueAgeSeconds: oldestDueAt
        ? Math.max(0, Math.floor((now.getTime() - oldestDueAt.getTime()) / 1000))
        : 0,
      checkedAt: now,
    };
  } catch (error) {
    throwNotificationDeliverySchemaSyncRequired(error);
  }
}

export async function assertNotificationControlPlaneReady() {
  const delegate = requireNotificationDelegate();
  try {
    await delegate.count({ where: { userId: "__schema_probe__", archivedAt: null, isRead: false } });
  } catch (error) {
    throwNotificationSchemaSyncRequired(error);
  }
}
