import Link from "next/link";
import { UserRole } from "@prisma/client";

import { PostCreateForm } from "@/components/posts/post-create-form";
import { ServiceUnavailableState } from "@/components/ui/service-unavailable-state";
import { auth } from "@/lib/auth";
import { getCurrentUserRole } from "@/server/auth";
import { redirectToProfileIfNicknameMissing } from "@/server/nickname-guard";
import { isPrismaDatabaseUnavailableError } from "@/server/prisma-database-error";
import { listCommunities } from "@/server/queries/community.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";

export default async function NewPostPage() {
  const session = await auth().catch((error) => {
    if (isPrismaDatabaseUnavailableError(error)) {
      return null;
    }
    throw error;
  });
  const userId = session?.user?.id;
  const currentUserRole = userId
    ? await getCurrentUserRole().catch((error) => {
        if (isPrismaDatabaseUnavailableError(error)) {
          return null;
        }
        throw error;
      })
    : null;
  redirectToProfileIfNicknameMissing({
    isAuthenticated: Boolean(userId),
    nickname: session?.user?.nickname,
  });
  const user = userId
    ? await getUserWithNeighborhoods(userId).catch((error) => {
        if (isPrismaDatabaseUnavailableError(error)) {
          return null;
        }
        throw error;
      })
    : null;
  const primaryNeighborhood = user?.neighborhoods.find((item) => item.isPrimary);

  const neighborhoods = user
    ? user.neighborhoods.map((item) => ({
        id: item.neighborhood.id,
        name: item.neighborhood.name,
        city: item.neighborhood.city,
        district: item.neighborhood.district,
      }))
    : [];
  const communities = await listCommunities({ limit: 50 }).catch((error) => {
    if (isPrismaDatabaseUnavailableError(error)) {
      return null;
    }
    throw error;
  });

  if (!communities) {
    return (
      <div className="tp-page-bg min-h-screen">
        <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 lg:px-10">
          <Link
            href="/feed"
            className="tp-btn-soft inline-flex w-fit items-center px-3.5 py-2 text-xs font-semibold"
          >
            목록으로
          </Link>
          <ServiceUnavailableState
            title="글 작성 준비가 지연됐습니다"
            description="게시판과 동네 정보를 불러오는 연결이 지연되고 있습니다. 작성 내용이 필요한 흐름이므로 잠시 후 다시 열어 주세요."
            primaryHref="/posts/new"
            primaryLabel="다시 시도"
            secondaryHref="/feed"
            secondaryLabel="피드로 이동"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="tp-page-bg min-h-screen">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 lg:px-10">
        <section className="tp-hero flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">커뮤니티 작성</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
              새 글 작성
            </h1>
            <p className="text-xs text-[#4f678d] sm:text-sm">
              {userId
                ? "분류와 공개 범위를 먼저 정하고, 핵심 정보 위주로 작성해 주세요."
                : "비회원 글은 즉시 공개되며, 외부 링크/연락처/고위험 카테고리는 제한됩니다."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-lg border border-[#d8e4f6] bg-white px-3 py-1.5 text-[#355988]">
              {userId ? "회원 작성" : "비회원 작성"}
            </span>
            <span className="rounded-lg border border-[#d8e4f6] bg-white px-3 py-1.5 text-[#355988]">
              자동 임시저장
            </span>
            <Link href="/feed" className="tp-btn-soft tp-btn-xs">
              피드로 돌아가기
            </Link>
          </div>
        </section>

        <PostCreateForm
          neighborhoods={neighborhoods}
          communities={communities.items}
          defaultNeighborhoodId={primaryNeighborhood?.neighborhood.id}
          isAuthenticated={Boolean(userId)}
          canCreateAdoptionListing={
            currentUserRole?.role === UserRole.ADMIN ||
            currentUserRole?.role === UserRole.MODERATOR
          }
        />
      </main>
    </div>
  );
}
