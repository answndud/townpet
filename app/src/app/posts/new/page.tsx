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
        <Link
          href="/feed"
          className="tp-btn-soft inline-flex w-fit items-center px-3.5 py-2 text-xs font-semibold"
        >
          목록으로
        </Link>

        <section className="tp-card p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-1.5 border-b border-[#dde7f5] pb-3 sm:mb-5 sm:gap-2 sm:pb-4">
            <h1 className="text-[26px] font-semibold text-[#10284a] sm:text-2xl">새 글 작성</h1>
            <p className="text-xs text-[#4f678d] sm:text-sm">
              {userId
                ? "핵심 정보 위주로 작성해 커뮤니티 피드 품질을 높여 주세요."
                : "비회원 글은 즉시 공개되며, 외부 링크/연락처/고위험 카테고리는 제한됩니다."}
            </p>
          </div>
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
        </section>
      </main>
    </div>
  );
}
