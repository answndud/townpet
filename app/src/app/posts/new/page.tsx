import Link from "next/link";
import { PostType, UserRole } from "@prisma/client";

import { AcquisitionEventTracker } from "@/components/analytics/acquisition-event-tracker";
import { PostCreateForm } from "@/components/posts/post-create-form";
import { ServiceUnavailableState } from "@/components/ui/service-unavailable-state";
import { auth } from "@/lib/auth";
import { createNoIndexPageMetadata } from "@/lib/page-metadata";
import { getCurrentUserRole } from "@/server/auth";
import { redirectToProfileIfNicknameMissing } from "@/server/nickname-guard";
import { isPrismaDatabaseUnavailableError } from "@/server/prisma-database-error";
import { getPostCreateTemplateById } from "@/lib/post-create-templates";
import { listCommunities } from "@/server/queries/community.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";

const PUBLIC_INITIAL_POST_TYPES = new Set<PostType>([
  PostType.QA_QUESTION,
  PostType.HOSPITAL_REVIEW,
  PostType.WALK_ROUTE,
  PostType.LOST_FOUND,
  PostType.MARKET_LISTING,
  PostType.PRODUCT_REVIEW,
]);

const POST_CREATE_BACK_LINK_CLASS_NAME =
  "tp-text-muted inline-flex min-h-10 w-fit items-center px-1.5 text-xs font-semibold transition hover:text-[#2f5da4] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";

const POST_CREATE_HEADER_BACK_LINK_CLASS_NAME =
  "tp-text-muted inline-flex min-h-10 items-center px-1.5 text-[11px] font-semibold transition hover:text-[#2f5da4] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";

export const metadata = createNoIndexPageMetadata({
  title: "글쓰기",
  description: "TownPet 게시글을 작성합니다.",
  path: "/posts/new",
});

type NewPostPageProps = {
  searchParams?: Promise<{
    template?: string;
    town?: string;
    type?: string;
  }>;
};

function parseInitialPostType(type?: string) {
  if (!type) {
    return undefined;
  }
  return Object.values(PostType).includes(type as PostType) ? (type as PostType) : undefined;
}

function parseTemplateTownLabel(value?: string) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return undefined;
  }
  return normalized.slice(0, 40);
}

export default async function NewPostPage({ searchParams }: NewPostPageProps) {
  const resolvedSearchParams = await searchParams;
  const templateTownLabel = parseTemplateTownLabel(resolvedSearchParams?.town);
  const requestedInitialPostType = parseInitialPostType(resolvedSearchParams?.type);
  const initialTemplate = getPostCreateTemplateById(
    resolvedSearchParams?.template,
    templateTownLabel,
  );
  const initialPostType =
    requestedInitialPostType && PUBLIC_INITIAL_POST_TYPES.has(requestedInitialPostType)
      ? requestedInitialPostType
      : initialTemplate?.type && PUBLIC_INITIAL_POST_TYPES.has(initialTemplate.type)
        ? initialTemplate.type
        : undefined;
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
  const canManageOperatorContent =
    currentUserRole?.role === UserRole.ADMIN || currentUserRole?.role === UserRole.MODERATOR;

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
            className={POST_CREATE_BACK_LINK_CLASS_NAME}
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
      {initialTemplate ? (
        <AcquisitionEventTracker
          event={{
            surface: "POST_CREATE",
            event: "WRITE_TEMPLATE_OPENED",
            targetType: "TEMPLATE",
            targetId: initialTemplate.id,
          }}
        />
      ) : null}
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-5 lg:px-10">
        <section className="tp-hero flex flex-col gap-2.5 p-3.5 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3f5f90]">글 작성</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-[#10284a] sm:text-2xl">
              {initialPostType === PostType.LOST_FOUND ? "분실/목격 제보 작성" : "새 글 작성"}
            </h1>
            <p className="mt-1 max-w-[680px] text-xs leading-5 text-[#4f678d] sm:text-[13px]">
              {initialPostType === PostType.LOST_FOUND
                ? "보호자는 분실 글을 작성하고, 목격자는 기존 글에 제보하고, 주변에는 링크/이미지를 공유합니다."
                : userId
                  ? "게시판과 공개 범위를 정한 뒤 핵심 정보부터 작성해 주세요."
                  : "비회원 글은 전체 공개로 등록되며 연락처, 외부 링크, 고위험 게시판은 제한됩니다."}
            </p>
            {initialPostType === PostType.LOST_FOUND ? (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-[#315b9a]">
                {["분실 글 작성", "목격 제보는 상세 댓글", "공유는 링크/이미지"].map((item) => (
                  <span key={item} className="rounded-md border border-[#d8e4f6] bg-white px-2 py-1">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="inline-flex h-[28px] items-center rounded-md border border-[#d8e4f6] bg-white px-2.5 font-semibold text-[#355988]">
              {userId ? "회원 작성" : "비회원 작성"}
            </span>
            <Link href="/feed" className={POST_CREATE_HEADER_BACK_LINK_CLASS_NAME}>
              피드로 돌아가기
            </Link>
          </div>
        </section>

        <PostCreateForm
          neighborhoods={neighborhoods}
          communities={communities.items}
          defaultNeighborhoodId={primaryNeighborhood?.neighborhood.id}
          isAuthenticated={Boolean(userId)}
          canCreateAdoptionListing={canManageOperatorContent}
          canMarkOperatorContent={canManageOperatorContent}
          initialType={initialPostType}
          initialTemplate={initialTemplate ?? undefined}
          templateTownLabel={templateTownLabel}
        />
      </main>
    </div>
  );
}
