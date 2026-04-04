import "dotenv/config";
import {
  CommentReactionType,
  PostReactionType,
  PostStatus,
  PrismaClient,
} from "@prisma/client";
import { assertLocalDevelopmentDatabase } from "../src/server/local-database-guard";

const prisma = new PrismaClient();

const COMMENT_TAG = "[seed-engagement]";
const COMMENT_POST_LIMIT = 24;

const ROOT_COMMENT_TEMPLATES = [
  "동네 기준으로 보면 이 글 내용 꽤 도움이 됐어요. 직접 해보신 분 후기 더 있으면 궁금합니다.",
  "비슷한 상황을 겪었는데, 글에 적어주신 체크포인트가 실제로 도움됐습니다.",
  "저도 같은 조건에서 확인해봤는데 정리해주신 내용이 꽤 정확하네요.",
  "주말에 비슷하게 적용해봤는데 생각보다 반응이 좋아서 공유 감사해요.",
] as const;

const REPLY_COMMENT_TEMPLATES = [
  "위 댓글처럼 진행하면 초반 시행착오를 좀 줄일 수 있었습니다.",
  "저도 같은 방식으로 했는데 크게 무리 없었어요.",
  "세부 조건만 조금 맞추면 그대로 따라가도 괜찮았습니다.",
] as const;

function rotate<T>(items: T[], offset: number) {
  if (items.length === 0) {
    return items;
  }

  const normalizedOffset = offset % items.length;
  return items.slice(normalizedOffset).concat(items.slice(0, normalizedOffset));
}

function pickUserIds(
  userIds: string[],
  excludedIds: Set<string>,
  offset: number,
  count: number,
) {
  return rotate(userIds, offset).filter((userId) => !excludedIds.has(userId)).slice(0, count);
}

function rootCommentContent(postTitle: string, template: string) {
  return `${COMMENT_TAG} ${postTitle}\n\n${template}`;
}

function replyCommentContent(template: string) {
  return `${COMMENT_TAG} ${template}`;
}

async function main() {
  assertLocalDevelopmentDatabase(process.env, "engagement dummy data seeding");

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { endsWith: "@townpet.dev" } },
        { email: { endsWith: "@townpet.local" } },
      ],
    },
    orderBy: { email: "asc" },
    select: {
      id: true,
      email: true,
    },
  });

  if (users.length < 10) {
    throw new Error("Not enough local seed users to generate engagement data.");
  }

  const userIds = users.map((user) => user.id);

  const existingSeedComments = await prisma.comment.findMany({
    where: {
      content: {
        startsWith: COMMENT_TAG,
      },
    },
    select: { id: true },
  });

  if (existingSeedComments.length > 0) {
    await prisma.comment.deleteMany({
      where: {
        id: {
          in: existingSeedComments.map((comment) => comment.id),
        },
      },
    });
  }

  const deletedPostReactions = await prisma.postReaction.deleteMany({
    where: {
      userId: {
        in: userIds,
      },
    },
  });

  const deletedCommentReactions = await prisma.commentReaction.deleteMany({
    where: {
      userId: {
        in: userIds,
      },
    },
  });

  const posts = await prisma.post.findMany({
    where: {
      status: PostStatus.ACTIVE,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      authorId: true,
      createdAt: true,
      viewCount: true,
      likeCount: true,
      dislikeCount: true,
    },
  });

  if (posts.length === 0) {
    throw new Error("No active posts available for engagement seed.");
  }

  let createdPostReactions = 0;
  for (const [index, post] of posts.entries()) {
    const maxReactors = Math.max(userIds.length - 1, 0);
    const targetLikes = Math.min(
      post.likeCount > 0 ? post.likeCount : 2 + (index % 4),
      maxReactors,
    );
    const targetDislikes = Math.min(
      post.dislikeCount > 0 ? post.dislikeCount : index % 7 === 0 ? 1 : 0,
      Math.max(maxReactors - targetLikes, 0),
    );

    const likeUserIds = pickUserIds(
      userIds,
      new Set([post.authorId]),
      index,
      targetLikes,
    );
    const dislikeUserIds = pickUserIds(
      userIds,
      new Set([post.authorId, ...likeUserIds]),
      index + 5,
      targetDislikes,
    );

    if (likeUserIds.length > 0) {
      await prisma.postReaction.createMany({
        data: likeUserIds.map((userId) => ({
          postId: post.id,
          userId,
          type: PostReactionType.LIKE,
        })),
      });
      createdPostReactions += likeUserIds.length;
    }

    if (dislikeUserIds.length > 0) {
      await prisma.postReaction.createMany({
        data: dislikeUserIds.map((userId) => ({
          postId: post.id,
          userId,
          type: PostReactionType.DISLIKE,
        })),
      });
      createdPostReactions += dislikeUserIds.length;
    }
  }

  const commentTargetPosts = posts
    .filter((post) => !post.title.startsWith("[댓글 데모]"))
    .slice(0, COMMENT_POST_LIMIT);

  let createdComments = 0;

  for (const [index, post] of commentTargetPosts.entries()) {
    const commentAuthors = pickUserIds(
      userIds,
      new Set([post.authorId]),
      index * 3,
      3,
    );

    if (commentAuthors.length < 2) {
      continue;
    }

    const createdAtBase = post.createdAt.getTime() + (index + 1) * 18 * 60_000;

    const firstRoot = await prisma.comment.create({
      data: {
        postId: post.id,
        authorId: commentAuthors[0],
        content: rootCommentContent(
          post.title,
          ROOT_COMMENT_TEMPLATES[index % ROOT_COMMENT_TEMPLATES.length],
        ),
        createdAt: new Date(createdAtBase),
        updatedAt: new Date(createdAtBase),
      },
      select: { id: true },
    });
    createdComments += 1;

    await prisma.comment.create({
      data: {
        postId: post.id,
        authorId: commentAuthors[1],
        content: rootCommentContent(
          post.title,
          ROOT_COMMENT_TEMPLATES[(index + 1) % ROOT_COMMENT_TEMPLATES.length],
        ),
        createdAt: new Date(createdAtBase + 7 * 60_000),
        updatedAt: new Date(createdAtBase + 7 * 60_000),
      },
    });
    createdComments += 1;

    if (commentAuthors[2]) {
      await prisma.comment.create({
        data: {
          postId: post.id,
          authorId: commentAuthors[2],
          parentId: firstRoot.id,
          content: replyCommentContent(
            REPLY_COMMENT_TEMPLATES[index % REPLY_COMMENT_TEMPLATES.length],
          ),
          createdAt: new Date(createdAtBase + 15 * 60_000),
          updatedAt: new Date(createdAtBase + 15 * 60_000),
        },
      });
      createdComments += 1;
    }
  }

  const seededComments = await prisma.comment.findMany({
    where: {
      content: {
        startsWith: COMMENT_TAG,
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      authorId: true,
    },
  });

  let createdCommentReactions = 0;

  for (const [index, comment] of seededComments.entries()) {
    const targetLikes = 1 + (index % 4);
    const targetDislikes = index % 6 === 0 ? 1 : 0;

    const likeUserIds = pickUserIds(
      userIds,
      new Set([comment.authorId]),
      index + 2,
      targetLikes,
    );
    const dislikeUserIds = pickUserIds(
      userIds,
      new Set([comment.authorId, ...likeUserIds]),
      index + 11,
      targetDislikes,
    );

    if (likeUserIds.length > 0) {
      await prisma.commentReaction.createMany({
        data: likeUserIds.map((userId) => ({
          commentId: comment.id,
          userId,
          type: CommentReactionType.LIKE,
        })),
      });
      createdCommentReactions += likeUserIds.length;
    }

    if (dislikeUserIds.length > 0) {
      await prisma.commentReaction.createMany({
        data: dislikeUserIds.map((userId) => ({
          commentId: comment.id,
          userId,
          type: CommentReactionType.DISLIKE,
        })),
      });
      createdCommentReactions += dislikeUserIds.length;
    }
  }

  const postReactionGroups = await prisma.postReaction.groupBy({
    by: ["postId", "type"],
    _count: { _all: true },
  });

  const commentGroups = await prisma.comment.groupBy({
    by: ["postId"],
    _count: { _all: true },
  });

  const seededCommentReactionGroups = await prisma.commentReaction.groupBy({
    by: ["commentId", "type"],
    where: {
      commentId: {
        in: seededComments.map((comment) => comment.id),
      },
    },
    _count: { _all: true },
  });

  const postReactionCountMap = new Map<
    string,
    { likeCount: number; dislikeCount: number }
  >();
  for (const group of postReactionGroups) {
    const current = postReactionCountMap.get(group.postId) ?? {
      likeCount: 0,
      dislikeCount: 0,
    };

    if (group.type === PostReactionType.LIKE) {
      current.likeCount = group._count._all;
    } else {
      current.dislikeCount = group._count._all;
    }

    postReactionCountMap.set(group.postId, current);
  }

  const commentCountMap = new Map(
    commentGroups.map((group) => [group.postId, group._count._all]),
  );

  for (const [index, post] of posts.entries()) {
    const reactionCounts = postReactionCountMap.get(post.id) ?? {
      likeCount: 0,
      dislikeCount: 0,
    };
    const commentCount = commentCountMap.get(post.id) ?? 0;
    const targetViewCount = Math.max(
      post.viewCount,
      reactionCounts.likeCount * 6 +
        reactionCounts.dislikeCount * 3 +
        commentCount * 9 +
        18 +
        (index % 12),
    );

    await prisma.post.update({
      where: { id: post.id },
      data: {
        likeCount: reactionCounts.likeCount,
        dislikeCount: reactionCounts.dislikeCount,
        commentCount,
        viewCount: targetViewCount,
      },
    });
  }

  const commentReactionCountMap = new Map<
    string,
    { likeCount: number; dislikeCount: number }
  >();
  for (const group of seededCommentReactionGroups) {
    const current = commentReactionCountMap.get(group.commentId) ?? {
      likeCount: 0,
      dislikeCount: 0,
    };

    if (group.type === CommentReactionType.LIKE) {
      current.likeCount = group._count._all;
    } else {
      current.dislikeCount = group._count._all;
    }

    commentReactionCountMap.set(group.commentId, current);
  }

  for (const comment of seededComments) {
    const reactionCounts = commentReactionCountMap.get(comment.id) ?? {
      likeCount: 0,
      dislikeCount: 0,
    };

    await prisma.comment.update({
      where: { id: comment.id },
      data: {
        likeCount: reactionCounts.likeCount,
        dislikeCount: reactionCounts.dislikeCount,
      },
    });
  }

  const totals = await Promise.all([
    prisma.postReaction.count(),
    prisma.commentReaction.count(),
    prisma.comment.count(),
    prisma.post.aggregate({
      _sum: {
        viewCount: true,
        likeCount: true,
        commentCount: true,
      },
    }),
  ]);

  const [postReactionCount, commentReactionCount, commentCount, postAggregate] = totals;

  console.log(
    JSON.stringify(
      {
        deletedSeedComments: existingSeedComments.length,
        deletedPostReactions: deletedPostReactions.count,
        deletedCommentReactions: deletedCommentReactions.count,
        createdComments,
        createdPostReactions,
        createdCommentReactions,
        totalComments: commentCount,
        totalPostReactions: postReactionCount,
        totalCommentReactions: commentReactionCount,
        totalPostViews: postAggregate._sum.viewCount ?? 0,
        totalPostLikes: postAggregate._sum.likeCount ?? 0,
        totalPostCommentCounts: postAggregate._sum.commentCount ?? 0,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("seed engagement failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
