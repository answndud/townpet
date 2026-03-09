import {
  NotificationEntityType,
  NotificationType,
  Prisma,
} from "@prisma/client";

import type { NotificationFilterKind } from "@/lib/notification-filter";
import { prisma } from "@/lib/prisma";
import {
  bumpNotificationListCacheVersion,
  bumpNotificationUnreadCacheVersion,
  createQueryCacheKey,
  withQueryCache,
} from "@/server/cache/query-cache";
import { logger, serializeError } from "@/server/logger";
import { assertSchemaDelegate, rethrowSchemaSyncRequired } from "@/server/schema-sync";

type ListNotificationsByUserOptions = {
  userId: string;
  limit?: number;
  cursor?: string;
  page?: number;
  kind?: NotificationFilterKind;
  unreadOnly?: boolean;
};

type CreateNotificationParams = {
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId: string;
  postId?: string | null;
  commentId?: string | null;
  title: string;
  body?: string | null;
  metadata?: Prisma.InputJsonValue;
};

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
  findMany(args: Prisma.NotificationFindManyArgs): Promise<NotificationListItem[]>;
  count(args: Prisma.NotificationCountArgs): Promise<number>;
  updateMany(args: Prisma.NotificationUpdateManyArgs): Promise<{ count: number }>;
  create(args: Prisma.NotificationCreateArgs): Promise<unknown>;
};

let notificationTableMissingWarned = false;
let missingDelegateWarned = false;

function getNotificationDelegate() {
  const delegate = (
    prisma as unknown as { notification?: NotificationDelegate }
  ).notification;

  if (!delegate && !missingDelegateWarned && process.env.NODE_ENV !== "test") {
    missingDelegateWarned = true;
    logger.warn("Prisma Client에 Notification 모델이 없어 알림 기능을 비활성화합니다.");
  }

  return delegate ?? null;
}

function warnMissingNotificationTable(error: unknown) {
  if (notificationTableMissingWarned) {
    return;
  }
  notificationTableMissingWarned = true;
  logger.warn("Notification 테이블이 없어 알림 기능을 비활성화합니다.", {
    error: serializeError(error),
  });
}

function requireNotificationDelegate() {
  return assertSchemaDelegate(
    getNotificationDelegate(),
    "Notification 모델이 누락되어 알림 기능을 사용할 수 없습니다. prisma generate 및 migrate deploy 후 다시 시도해 주세요.",
  );
}

function throwNotificationSchemaSyncRequired(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
    warnMissingNotificationTable(error);
  }

  rethrowSchemaSyncRequired(
    error,
    "Notification 스키마가 누락되어 알림 기능을 사용할 수 없습니다. prisma generate 및 migrate deploy 후 다시 시도해 주세요.",
    {
      columns: ["Notification.archivedAt"],
    },
  );
}

function bumpNotificationCaches(userId: string) {
  void bumpNotificationUnreadCacheVersion(userId).catch(() => undefined);
  void bumpNotificationListCacheVersion(userId).catch(() => undefined);
}

export async function listNotificationsByUser({
  userId,
  limit = 20,
  cursor,
  page = 1,
  kind = "ALL",
  unreadOnly = false,
}: ListNotificationsByUserOptions): Promise<ListNotificationsByUserResult> {
  const delegate = requireNotificationDelegate();

  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safePage = Math.max(page, 1);
  const typeFilter =
    kind === "COMMENT"
      ? [NotificationType.COMMENT_ON_POST, NotificationType.REPLY_TO_COMMENT]
      : kind === "REACTION"
        ? [NotificationType.REACTION_ON_POST]
        : kind === "SYSTEM"
          ? [NotificationType.SYSTEM]
          : null;
  const where: Prisma.NotificationWhereInput = {
    userId,
    archivedAt: null,
    ...(unreadOnly ? { isRead: false } : {}),
    ...(typeFilter ? { type: { in: typeFilter } } : {}),
  };

  const fetchNotificationItems = async (): Promise<ListNotificationsByUserResult> => {
    let items: NotificationListItem[];
    let totalCount = 0;
    try {
      totalCount = await delegate.count({ where });
      const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));
      const resolvedPage = Math.min(safePage, totalPages);

      items = await delegate.findMany({
        where,
        take: cursor ? safeLimit + 1 : safeLimit,
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : resolvedPage > 1
            ? {
                skip: (resolvedPage - 1) * safeLimit,
              }
            : {}),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          actor: {
            select: {
              id: true,
              nickname: true,
              image: true,
            },
          },
        },
      });
    } catch (error) {
      throwNotificationSchemaSyncRequired(error);
    }

    let nextCursor: string | null = null;
    if (cursor && items.length > safeLimit) {
      const next = items.pop();
      nextCursor = next?.id ?? null;
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));
    return {
      items,
      nextCursor,
      page: Math.min(safePage, totalPages),
      totalPages,
      totalCount,
    };
  };

  if (cursor || safePage > 1) {
    return fetchNotificationItems();
  }

  return withQueryCache({
    key: await createQueryCacheKey(`notification-list:${userId}`, {
      limit: safeLimit,
      kind,
      unreadOnly: unreadOnly ? "1" : "0",
    }),
    ttlSeconds: 5,
    fetcher: fetchNotificationItems,
  });
}

export async function countUnreadNotifications(userId: string) {
  const delegate = requireNotificationDelegate();

  const fetchUnreadCount = async () => {
    try {
      return await delegate.count({
        where: {
          userId,
          archivedAt: null,
          isRead: false,
        },
      });
    } catch (error) {
      throwNotificationSchemaSyncRequired(error);
    }
  };

  return withQueryCache({
    key: await createQueryCacheKey(`notification-unread:${userId}`, {
      type: "count",
    }),
    ttlSeconds: 5,
    fetcher: fetchUnreadCount,
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const delegate = requireNotificationDelegate();

  let result: { count: number };
  try {
    result = await delegate.updateMany({
      where: {
        id: notificationId,
        userId,
        archivedAt: null,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  } catch (error) {
    throwNotificationSchemaSyncRequired(error);
  }

  const changed = result.count > 0;
  if (changed) {
    bumpNotificationCaches(userId);
  }

  return changed;
}

export async function markAllNotificationsRead(userId: string) {
  const delegate = requireNotificationDelegate();

  let result: { count: number };
  try {
    result = await delegate.updateMany({
      where: {
        userId,
        archivedAt: null,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  } catch (error) {
    throwNotificationSchemaSyncRequired(error);
  }

  if (result.count > 0) {
    bumpNotificationCaches(userId);
  }

  return result.count;
}

export async function archiveNotification(userId: string, notificationId: string) {
  const delegate = requireNotificationDelegate();

  let result: { count: number };
  try {
    result = await delegate.updateMany({
      where: {
        id: notificationId,
        userId,
        archivedAt: null,
      },
      data: {
        archivedAt: new Date(),
      },
    });
  } catch (error) {
    throwNotificationSchemaSyncRequired(error);
  }

  const changed = result.count > 0;
  if (changed) {
    bumpNotificationCaches(userId);
  }

  return changed;
}

export async function createNotification(params: CreateNotificationParams) {
  const delegate = requireNotificationDelegate();

  try {
    const created = await delegate.create({
      data: {
        userId: params.userId,
        actorId: params.actorId ?? null,
        type: params.type,
        entityType: params.entityType,
        entityId: params.entityId,
        postId: params.postId ?? null,
        commentId: params.commentId ?? null,
        title: params.title,
        body: params.body ?? null,
        metadata: params.metadata,
      },
    });

    bumpNotificationCaches(params.userId);
    return created;
  } catch (error) {
    throwNotificationSchemaSyncRequired(error);
  }
}

export async function assertNotificationControlPlaneReady() {
  const delegate = requireNotificationDelegate();

  try {
    await delegate.count({
      where: {
        userId: "__schema_probe__",
        archivedAt: null,
        isRead: false,
      },
    });
  } catch (error) {
    throwNotificationSchemaSyncRequired(error);
  }
}
