import { NextRequest, NextResponse } from "next/server";

import { requireCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getNotificationNavigationTarget } from "@/server/queries/notification.queries";
import { ServiceError } from "@/server/services/service-error";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  let userId: string | undefined;

  try {
    userId = await requireCurrentUserId();
    const { id } = await params;
    const target = await getNotificationNavigationTarget(userId, id);
    const href = target.found ? target.href : "/notifications";

    return NextResponse.redirect(new URL(href, request.url));
  } catch (error) {
    if (error instanceof ServiceError) {
      if (error.status === 401) {
        return NextResponse.redirect(new URL("/login?next=%2Fnotifications", request.url));
      }

      return NextResponse.redirect(new URL("/notifications", request.url));
    }

    await monitorUnhandledError(error, {
      route: "GET /notifications/redirect/[id]",
      request,
      userId,
    });
    return NextResponse.redirect(new URL("/notifications", request.url));
  }
}
