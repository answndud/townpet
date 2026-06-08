import { PostStatus, PostType, UserRole } from "@prisma/client";

import {
  getLostFoundSightingManagementSnapshot,
  type LostFoundSightingManagementSnapshot,
} from "@/server/queries/lost-found-sighting-management.queries";
import { ServiceError } from "@/server/services/service-error";

type SightingManagementViewer = {
  id: string;
  role: UserRole;
};

function canManageLostFoundSightings({
  viewer,
  postAuthorId,
}: {
  viewer: SightingManagementViewer;
  postAuthorId: string;
}) {
  return (
    viewer.id === postAuthorId ||
    viewer.role === UserRole.ADMIN ||
    viewer.role === UserRole.MODERATOR
  );
}

export type LostFoundSightingManagementView = NonNullable<
  Awaited<ReturnType<typeof getLostFoundSightingManagementView>>
>;

export async function getLostFoundSightingManagementView({
  postId,
  viewer,
}: {
  postId: string;
  viewer: SightingManagementViewer;
}) {
  const snapshot = await getLostFoundSightingManagementSnapshot(postId);
  if (!snapshot || !snapshot.post.lostFoundAlert || snapshot.post.type !== PostType.LOST_FOUND) {
    return null;
  }

  if (
    snapshot.post.status !== PostStatus.ACTIVE &&
    snapshot.post.status !== PostStatus.HIDDEN
  ) {
    return null;
  }

  if (!canManageLostFoundSightings({ viewer, postAuthorId: snapshot.post.authorId })) {
    throw new ServiceError("게시글을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  return normalizeLostFoundSightingManagementSnapshot(snapshot);
}

function normalizeLostFoundSightingManagementSnapshot(
  snapshot: NonNullable<LostFoundSightingManagementSnapshot>,
) {
  return {
    post: snapshot.post,
    sightings: snapshot.sightings,
    totalSightingCount: snapshot.totalSightingCount,
    privateSightingCount: snapshot.privateSightingCount,
    publicSightingCount: Math.max(
      0,
      snapshot.totalSightingCount - snapshot.privateSightingCount,
    ),
    latestSightingAt: snapshot.sightings[0]?.createdAt ?? null,
    isTruncated: snapshot.isTruncated,
  };
}
