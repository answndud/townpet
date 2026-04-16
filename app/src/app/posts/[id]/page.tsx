import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { PostDetailClient } from "@/components/posts/post-detail-client";
import { getCspNonce } from "@/lib/csp-nonce";
import { buildPostDetailMetadata } from "@/lib/post-page-metadata";
import { getCurrentUser } from "@/server/auth";
import { redirectToProfileIfNicknameMissing } from "@/server/nickname-guard";
import { isPrismaDatabaseUnavailableError } from "@/server/prisma-database-error";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { getPostMetadataById } from "@/server/queries/post.queries";

export const dynamic = "force-dynamic";

type PostDetailPageProps = {
  params?: Promise<{ id?: string }>;
};

export async function generateMetadata({
  params,
}: PostDetailPageProps): Promise<Metadata> {
  const resolvedParams = (await params) ?? {};
  const [post, loginRequiredTypes] = await Promise.all([
    getPostMetadataById(resolvedParams.id).catch((error) => {
      if (isPrismaDatabaseUnavailableError(error)) {
        return null;
      }
      throw error;
    }),
    getGuestReadLoginRequiredPostTypes(),
  ]);

  return buildPostDetailMetadata(post, loginRequiredTypes);
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  await connection();
  const resolvedParams = (await params) ?? {};
  const postId = resolvedParams.id ?? "";
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/posts/${postId}/guest`);
  }
  redirectToProfileIfNicknameMissing({
    isAuthenticated: true,
    nickname: user.nickname,
  });
  const cspNonce = await getCspNonce();
  return <PostDetailClient postId={postId} cspNonce={cspNonce} />;
}
