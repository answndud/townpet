import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { ServiceError } from "@/server/services/service-error";

import { formatKoreanDateTime } from "@/lib/date-format";
import {
  getLostFoundAlertTypeLabel,
  getLostFoundStatusLabel,
} from "@/lib/lost-found-labels";
import { resolvePublicGuestDisplayName } from "@/lib/public-guest-identity";
import { resolveUserDisplayName } from "@/lib/user-display";
import { getCurrentUser } from "@/server/auth";
import { redirectToProfileIfNicknameMissing } from "@/server/nickname-guard";
import { getLostFoundSightingManagementView } from "@/server/services/lost-found-sighting-management.service";

type LostFoundSightingManagementPageProps = {
  params?: Promise<{ id?: string }>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "분실/목격 제보 관리 | TownPet",
  robots: {
    index: false,
    follow: false,
  },
};

function resolveSightingAuthorName(sighting: {
  guestAuthorId: string | null;
  guestAuthor?: { displayName: string | null } | null;
  author: { nickname: string | null };
}) {
  if (sighting.guestAuthorId) {
    return `비회원 ${resolvePublicGuestDisplayName(sighting.guestAuthor?.displayName)}`;
  }

  return resolveUserDisplayName(sighting.author.nickname);
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="tp-card p-4">
      <p className="tp-text-muted text-xs font-semibold">{label}</p>
      <p className="tp-text-heading mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default async function LostFoundSightingManagementPage({
  params,
}: LostFoundSightingManagementPageProps) {
  await connection();
  const postId = (await params)?.id ?? "";
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/posts/${postId}/sightings`)}`);
  }

  redirectToProfileIfNicknameMissing({
    isAuthenticated: true,
    nickname: user.nickname,
  });

  let view: Awaited<ReturnType<typeof getLostFoundSightingManagementView>>;
  try {
    view = await getLostFoundSightingManagementView({
      postId,
      viewer: {
        id: user.id,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof ServiceError && error.code === "POST_NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  if (!view) {
    notFound();
  }

  const alert = view.post.lostFoundAlert;
  if (!alert) {
    notFound();
  }

  const latestSightingLabel = view.latestSightingAt
    ? formatKoreanDateTime(view.latestSightingAt)
    : "없음";

  return (
    <main className="tp-page-bg min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4">
        <Link
          href={`/posts/${view.post.id}`}
          className="tp-text-link inline-flex min-h-10 w-fit items-center text-xs font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2"
        >
          ← 게시글
        </Link>

        <section className="tp-card p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4e6f9f]">
            보호자 제보 관리
          </p>
          <h1 className="tp-text-heading mt-2 text-2xl font-semibold sm:text-3xl">
            {view.post.title}
          </h1>
          <p className="tp-text-subtle mt-3 max-w-[68ch] text-sm leading-6">
            공개 댓글과 보호자 공개 제보를 한 화면에서 확인합니다. 전화번호, 오픈채팅,
            집 주소 전체를 새로 수집하지 않고 기존 목격 제보 댓글만 표시합니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="tp-chip-base tp-chip-muted">
              {getLostFoundAlertTypeLabel(alert.alertType)}
            </span>
            <span className="tp-chip-base tp-chip-muted">
              {getLostFoundStatusLabel(alert.status)}
            </span>
            <span className="tp-chip-base tp-chip-muted">{alert.petType}</span>
            <span className="tp-chip-base tp-chip-muted">
              마지막 확인 {formatKoreanDateTime(alert.lastSeenAt)}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/posts/${view.post.id}#comments`}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#3567b5] px-3 text-xs font-semibold text-white transition hover:bg-[#2f5da4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2"
            >
              댓글 제보
            </Link>
            <Link
              href={`/posts/${view.post.id}#lost-found-share-tools`}
              className="tp-text-link inline-flex min-h-10 items-center justify-center px-1.5 text-xs font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2"
            >
              공유 도구
            </Link>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-4" aria-label="목격 제보 요약">
          <StatCard label="전체 제보" value={view.totalSightingCount} />
          <StatCard label="보호자 공개" value={view.privateSightingCount} />
          <StatCard label="공개 제보" value={view.publicSightingCount} />
          <StatCard label="최근 제보" value={latestSightingLabel} />
        </section>

        <section className="tp-card p-4 sm:p-5" aria-labelledby="sighting-list-title">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4e6f9f]">
                목격 제보
              </p>
              <h2 id="sighting-list-title" className="tp-text-heading mt-1 text-lg font-semibold">
                목격 제보 목록
              </h2>
            </div>
            {view.isTruncated ? (
              <p className="tp-text-muted text-xs">최근 100건만 표시합니다.</p>
            ) : null}
          </div>

          {view.sightings.length > 0 ? (
            <ol className="mt-4 divide-y divide-[#e5edf8]">
              {view.sightings.map((sighting) => {
                const seenAtLabel = sighting.sightingSeenAt
                  ? formatKoreanDateTime(sighting.sightingSeenAt)
                  : "시간 미확인";
                return (
                  <li key={sighting.id} className="grid gap-2 py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-[#10284a]">
                        {resolveSightingAuthorName(sighting)}
                      </span>
                      <span className="tp-text-muted">{formatKoreanDateTime(sighting.createdAt)}</span>
                      {sighting.isPrivateSighting ? (
                        <span className="rounded-md bg-[#fff7ed] px-2 py-1 font-semibold text-[#9a5a14]">
                          보호자 공개
                        </span>
                      ) : (
                        <span className="rounded-md bg-[#eef7ff] px-2 py-1 font-semibold text-[#315b9a]">
                          공개
                        </span>
                      )}
                    </div>
                    <dl className="grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="tp-text-muted text-xs font-semibold">목격 위치</dt>
                        <dd className="tp-text-heading mt-1">
                          {sighting.sightingLocation?.trim() || "위치 미확인"}
                        </dd>
                      </div>
                      <div>
                        <dt className="tp-text-muted text-xs font-semibold">목격 시간</dt>
                        <dd className="tp-text-heading mt-1">{seenAtLabel}</dd>
                      </div>
                    </dl>
                    <p className="tp-text-primary whitespace-pre-wrap text-sm leading-6">
                      {sighting.content}
                    </p>
                    {sighting.sightingImageUrl ? (
                      <a
                        href={sighting.sightingImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="tp-text-link w-fit text-xs font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0]"
                      >
                        첨부 이미지
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="tp-text-subtle mt-4 border-t border-[#e5edf8] pt-4 text-sm leading-6">
              아직 목격 제보가 없습니다. 공유 도구로 전단 이미지를 배포하고, 목격자는
              댓글의 목격 제보 양식으로 위치와 시간을 남기게 안내하세요.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
