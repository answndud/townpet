import type { PostReactionType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function findViewerPostReaction({
  postId,
  userId,
}: {
  postId: string;
  userId: string;
}): Promise<PostReactionType | null> {
  const reaction = await prisma.postReaction.findUnique({
    where: { postId_userId: { postId, userId } },
    select: { type: true },
  });

  return reaction?.type ?? null;
}
