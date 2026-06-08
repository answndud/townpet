import { CommentKind, PostStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const SIGHTING_MANAGEMENT_LIMIT = 100;

export type LostFoundSightingManagementSnapshot = Awaited<
  ReturnType<typeof getLostFoundSightingManagementSnapshot>
>;

export async function getLostFoundSightingManagementSnapshot(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      title: true,
      type: true,
      status: true,
      commentCount: true,
      createdAt: true,
      lostFoundAlert: {
        select: {
          alertType: true,
          petType: true,
          breed: true,
          lastSeenAt: true,
          lastSeenLocation: true,
          status: true,
        },
      },
      comments: {
        where: {
          kind: CommentKind.LOST_FOUND_SIGHTING,
          status: PostStatus.ACTIVE,
        },
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        take: SIGHTING_MANAGEMENT_LIMIT,
        select: {
          id: true,
          authorId: true,
          guestAuthorId: true,
          content: true,
          sightingLocation: true,
          sightingSeenAt: true,
          sightingImageUrl: true,
          isPrivateSighting: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              nickname: true,
            },
          },
          guestAuthor: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      },
    },
  });

  if (!post) {
    return null;
  }

  const [totalSightingCount, privateSightingCount] = await Promise.all([
    prisma.comment.count({
      where: {
        postId,
        kind: CommentKind.LOST_FOUND_SIGHTING,
        status: PostStatus.ACTIVE,
      },
    }),
    prisma.comment.count({
      where: {
        postId,
        kind: CommentKind.LOST_FOUND_SIGHTING,
        status: PostStatus.ACTIVE,
        isPrivateSighting: true,
      },
    }),
  ]);

  return {
    post,
    sightings: post.comments,
    totalSightingCount,
    privateSightingCount,
    isTruncated: totalSightingCount > post.comments.length,
  };
}
