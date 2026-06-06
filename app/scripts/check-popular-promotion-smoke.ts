import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { PostReactionType, PostScope, PostStatus, PostType, Prisma } from "@prisma/client";

import { POPULAR_POST_POLICY_KEY } from "@/lib/popular-post-policy";
import { prisma } from "@/lib/prisma";
import { bumpFeedCacheVersion } from "@/server/cache/query-cache";
import { assertLocalDevelopmentDatabase } from "@/server/local-database-guard";
import { listBestPosts } from "@/server/queries/post.queries";
import { togglePostReaction } from "@/server/services/post.service";

const CURRENT_FILE_PATH = fileURLToPath(import.meta.url);
const SMOKE_POLICY_MIN_LIKES = 2;

type PopularPromotionSmokeResult = {
  runId: string;
  threshold: number;
  postId: string;
  postCreatedAt: Date;
  afterFirstLike: {
    likeCount: number;
    isPopular: boolean;
  };
  afterSecondLike: {
    likeCount: number;
    isPopular: boolean;
    popularPromotedAt: Date | null;
  };
  bestFeedContainsPost: boolean;
};

type CleanupStep = {
  label: string;
  run: () => Promise<void>;
};

export function assertPopularPromotionSmokeResult(result: PopularPromotionSmokeResult) {
  if (result.afterFirstLike.likeCount !== 1) {
    throw new Error(`Expected first like count to be 1, got ${result.afterFirstLike.likeCount}.`);
  }

  if (result.afterFirstLike.isPopular) {
    throw new Error("Post was promoted before reaching the popular threshold.");
  }

  if (result.afterSecondLike.likeCount !== result.threshold) {
    throw new Error(
      `Expected promoted like count to equal threshold ${result.threshold}, got ${result.afterSecondLike.likeCount}.`,
    );
  }

  if (!result.afterSecondLike.isPopular || !result.afterSecondLike.popularPromotedAt) {
    throw new Error("Post did not persist popular promotion state after reaching threshold.");
  }

  if (!result.bestFeedContainsPost) {
    throw new Error("Promoted post was not returned by the popular feed query.");
  }
}

export async function runPopularPromotionSmokeCleanup(steps: CleanupStep[]) {
  const failures: Array<{ label: string; error: unknown }> = [];

  for (const step of steps) {
    try {
      await step.run();
    } catch (error) {
      failures.push({ label: step.label, error });
    }
  }

  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((failure) => failure.error),
      `Popular promotion smoke cleanup failed: ${failures.map((failure) => failure.label).join(", ")}`,
    );
  }
}

export function formatPopularPromotionSmokeResult(result: PopularPromotionSmokeResult) {
  return [
    "Popular promotion smoke passed",
    `- runId: ${result.runId}`,
    `- postId: ${result.postId}`,
    `- postCreatedAt: ${result.postCreatedAt.toISOString()}`,
    `- threshold: ${result.threshold}`,
    `- afterFirstLike: likeCount=${result.afterFirstLike.likeCount}, isPopular=${result.afterFirstLike.isPopular}`,
    `- afterSecondLike: likeCount=${result.afterSecondLike.likeCount}, isPopular=${result.afterSecondLike.isPopular}, popularPromotedAt=${result.afterSecondLike.popularPromotedAt?.toISOString() ?? "null"}`,
    `- bestFeedContainsPost: ${result.bestFeedContainsPost}`,
  ].join("\n");
}

function createRunId() {
  return `popular-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toSiteSettingInputValue(value: Prisma.JsonValue): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

async function restorePopularPolicy(previousSetting: { value: Prisma.JsonValue } | null) {
  if (previousSetting) {
    const value = toSiteSettingInputValue(previousSetting.value);
    await prisma.siteSetting.upsert({
      where: { key: POPULAR_POST_POLICY_KEY },
      update: { value },
      create: {
        key: POPULAR_POST_POLICY_KEY,
        value,
      },
    });
    return;
  }

  await prisma.siteSetting.deleteMany({
    where: { key: POPULAR_POST_POLICY_KEY },
  });
}

async function cleanupSmokeData(params: {
  postId?: string;
  emails: string[];
}) {
  if (params.postId) {
    await prisma.notificationDelivery.deleteMany({
      where: { OR: [{ postId: params.postId }, { entityId: params.postId }] },
    });
    await prisma.notification.deleteMany({
      where: { OR: [{ postId: params.postId }, { entityId: params.postId }] },
    });
    await prisma.post.deleteMany({
      where: { id: params.postId },
    });
  }

  await prisma.user.deleteMany({
    where: { email: { in: params.emails } },
  });
}

async function runPopularPromotionSmoke(): Promise<PopularPromotionSmokeResult> {
  assertLocalDevelopmentDatabase(process.env, "popular promotion smoke");

  const runId = createRunId();
  const emails = [
    `${runId}-author@townpet.dev`,
    `${runId}-liker-1@townpet.dev`,
    `${runId}-liker-2@townpet.dev`,
  ];
  let postId: string | undefined;
  const previousPolicy = await prisma.siteSetting.findUnique({
    where: { key: POPULAR_POST_POLICY_KEY },
    select: { value: true },
  });

  try {
    await prisma.siteSetting.upsert({
      where: { key: POPULAR_POST_POLICY_KEY },
      update: { value: { minLikes: SMOKE_POLICY_MIN_LIKES } },
      create: {
        key: POPULAR_POST_POLICY_KEY,
        value: { minLikes: SMOKE_POLICY_MIN_LIKES },
      },
    });
    await bumpFeedCacheVersion();

    const oldCreatedAt = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    const [author, likerOne, likerTwo] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: emails[0],
          nickname: `${runId}-author`,
          emailVerified: new Date(),
        },
        select: { id: true },
      }),
      prisma.user.create({
        data: {
          email: emails[1],
          nickname: `${runId}-liker-1`,
          emailVerified: new Date(),
        },
        select: { id: true },
      }),
      prisma.user.create({
        data: {
          email: emails[2],
          nickname: `${runId}-liker-2`,
          emailVerified: new Date(),
        },
        select: { id: true },
      }),
    ]);

    const post = await prisma.post.create({
      data: {
        authorId: author.id,
        type: PostType.FREE_BOARD,
        scope: PostScope.GLOBAL,
        status: PostStatus.ACTIVE,
        title: `[POPULAR SMOKE] ${runId}`,
        content: "인기글 승격 smoke 검증용 임시 게시글입니다.",
        structuredSearchText: `[POPULAR SMOKE] ${runId} 인기글 승격 smoke`,
        createdAt: oldCreatedAt,
        isPopular: false,
        popularPromotedAt: null,
        likeCount: 0,
        dislikeCount: 0,
      },
      select: { id: true },
    });
    postId = post.id;

    await togglePostReaction({
      postId,
      userId: likerOne.id,
      type: PostReactionType.LIKE,
    });
    const afterFirstLike = await prisma.post.findUniqueOrThrow({
      where: { id: postId },
      select: { likeCount: true, isPopular: true },
    });

    await togglePostReaction({
      postId,
      userId: likerTwo.id,
      type: PostReactionType.LIKE,
    });
    const afterSecondLike = await prisma.post.findUniqueOrThrow({
      where: { id: postId },
      select: { likeCount: true, isPopular: true, popularPromotedAt: true },
    });

    const popularFeed = await listBestPosts({
      limit: 10,
      page: 1,
      scope: PostScope.GLOBAL,
      q: runId,
      searchIn: "TITLE_CONTENT",
      minLikes: SMOKE_POLICY_MIN_LIKES,
    });
    const result: PopularPromotionSmokeResult = {
      runId,
      threshold: SMOKE_POLICY_MIN_LIKES,
      postId,
      postCreatedAt: oldCreatedAt,
      afterFirstLike,
      afterSecondLike,
      bestFeedContainsPost: popularFeed.some((item) => item.id === postId),
    };

    assertPopularPromotionSmokeResult(result);
    return result;
  } finally {
    await runPopularPromotionSmokeCleanup([
      {
        label: "smoke data",
        run: () => cleanupSmokeData({ postId, emails }),
      },
      {
        label: "popular policy",
        run: () => restorePopularPolicy(previousPolicy),
      },
      {
        label: "feed cache",
        run: () => bumpFeedCacheVersion(),
      },
    ]);
  }
}

export async function main() {
  const result = await runPopularPromotionSmoke();
  console.log(formatPopularPromotionSmokeResult(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === CURRENT_FILE_PATH) {
  main()
    .catch((error) => {
      console.error("Popular promotion smoke failed");
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
