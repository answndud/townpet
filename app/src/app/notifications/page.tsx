import Link from "next/link";
import type { Metadata } from "next";

import { NotificationCenter } from "@/components/notifications/notification-center";
import { parsePositivePage } from "@/lib/pagination";
import {
  parseNotificationFilterKind,
  parseUnreadOnly,
} from "@/lib/notification-filter";
import { auth } from "@/lib/auth";
import { redirectToProfileIfNicknameMissing } from "@/server/nickname-guard";
import { listNotificationsByUser } from "@/server/queries/notification.queries";

type NotificationsPageProps = {
  searchParams?: Promise<{ kind?: string; unreadOnly?: string; page?: string }>;
};

export const metadata: Metadata = {
  title: "알림",
  description: "댓글, 답글, 반응 알림을 한곳에서 확인합니다.",
  alternates: {
    canonical: "/notifications",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const resolvedSearchParamsPromise =
    searchParams ?? Promise.resolve({} as { kind?: string; unreadOnly?: string; page?: string });
  const [session, resolvedSearchParams] = await Promise.all([
    auth(),
    resolvedSearchParamsPromise,
  ]);
  const currentUserId = session?.user?.id ?? null;
  redirectToProfileIfNicknameMissing({
    isAuthenticated: Boolean(currentUserId),
    nickname: session?.user?.nickname,
  });
  const kind = parseNotificationFilterKind(resolvedSearchParams.kind);
  const unreadOnly = parseUnreadOnly(resolvedSearchParams.unreadOnly);
  const currentPage = parsePositivePage(resolvedSearchParams.page);

  if (!currentUserId) {
    return (
      <div className="tp-page-bg min-h-screen pb-16">
        <main className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-4 py-8 sm:px-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[#4e6f9f]">알림</p>
          <h1 className="tp-text-page-title text-[#10284a]">
            로그인 후 알림을 확인할 수 있습니다.
          </h1>
          <p className="text-sm text-[#4f678d]">
            댓글, 답글, 좋아요 알림은 로그인 사용자에게만 제공됩니다.
          </p>
          <div>
            <Link
              href="/login?next=%2Fnotifications"
              className="tp-btn-primary tp-btn-md inline-flex"
            >
              로그인하기
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { items, totalPages, page } = await listNotificationsByUser({
    userId: currentUserId,
    limit: 20,
    page: currentPage,
    kind,
    unreadOnly,
  });
  const initialItems = items.map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    isRead: item.isRead,
    createdAt: item.createdAt.toISOString(),
    postId: item.postId,
    commentId: item.commentId,
    actor: item.actor
      ? {
          id: item.actor.id,
          nickname: item.actor.nickname,
          image: item.actor.image,
        }
      : null,
  }));

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[980px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <NotificationCenter
          key={`${kind}|${unreadOnly ? "1" : "0"}|${page}`}
          initialItems={initialItems}
          currentPage={page}
          totalPages={totalPages}
          initialKind={kind}
          initialUnreadOnly={unreadOnly}
        />
      </main>
    </div>
  );
}
