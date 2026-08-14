import type { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { auth } from "@/lib/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { countUnreadNotifications } from "@/server/queries/notification.queries";
import { getUserById } from "@/server/queries/user.queries";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";
import { prepareNotificationList } from "@/server/services/notifications/notification.service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const userId = session?.user?.id ?? null;
    if (!userId) {
      return jsonOk(
        {
          isAuthenticated: false,
          userId: null,
          canModerate: false,
          unreadNotificationCount: 0,
        },
        {
          headers: {
            "cache-control": "no-store",
          },
        },
      );
    }

    await prepareNotificationList(userId);
    const [currentUser, unreadNotificationCount] = await Promise.all([
      getUserById(userId).catch(() => null),
      countUnreadNotifications(userId).catch((error) => {
        if (error instanceof ServiceError && error.code === "SCHEMA_SYNC_REQUIRED") {
          return 0;
        }
        throw error;
      }),
    ]);
    const canModerate =
      currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MODERATOR;

    return jsonOk(
      {
        isAuthenticated: true,
        userId,
        canModerate,
        unreadNotificationCount,
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, {
      route: "GET /api/viewer-shell",
      request,
    });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
