import "dotenv/config";
import { pathToFileURL } from "node:url";

import {
  CareApplicationStatus,
  CareFeedbackAuthorRole,
  CareFeedbackIssueType,
  CareFeedbackOutcome,
  CareFeedbackReviewStatus,
  CareRequestStatus,
  CareType,
  PostScope,
  PostStatus,
  PostType,
  PrismaClient,
  UserRole,
} from "@prisma/client";

import { assertLocalDevelopmentDatabase } from "../src/server/local-database-guard";
import { hashPassword } from "../src/server/password";

const prisma = new PrismaClient();

const DEMO_PREFIX = "[CARE DEMO]";
const DEMO_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "townpet123";

type CareDemoAccount = {
  email: string;
  nickname: string;
  role: UserRole;
};

const careDemoAccounts: CareDemoAccount[] = [
  {
    email: "care.requester@townpet.dev",
    nickname: "care-requester-demo",
    role: UserRole.USER,
  },
  {
    email: "care.caregiver@townpet.dev",
    nickname: "care-caregiver-demo",
    role: UserRole.USER,
  },
  {
    email: "care.admin@townpet.dev",
    nickname: "care-admin-demo",
    role: UserRole.ADMIN,
  },
];

export function summarizeCareDemoSeed(params: {
  posts: number;
  requests: number;
  applications: number;
  feedbacks: number;
  pendingReviews: number;
}) {
  return {
    posts: params.posts,
    requests: params.requests,
    applications: params.applications,
    feedbacks: params.feedbacks,
    hasIssueQueueCase: params.feedbacks > 0,
    pendingReviews: params.pendingReviews,
  };
}

async function upsertDemoNeighborhood() {
  return prisma.neighborhood.upsert({
    where: {
      name_city_district: {
        city: "서울",
        district: "서초구",
        name: "케어검증동",
      },
    },
    update: {},
    create: {
      city: "서울",
      district: "서초구",
      name: "케어검증동",
    },
  });
}

async function upsertDemoAccounts(neighborhoodId: string) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const users = new Map<string, { id: string; email: string; nickname: string | null }>();

  for (const account of careDemoAccounts) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        nickname: account.nickname,
        nicknameUpdatedAt: null,
        bio: null,
        role: account.role,
        emailVerified: new Date("2025-01-01T00:00:00.000Z"),
        passwordHash,
      },
      create: {
        email: account.email,
        nickname: account.nickname,
        role: account.role,
        emailVerified: new Date("2025-01-01T00:00:00.000Z"),
        passwordHash,
      },
      select: { id: true, email: true, nickname: true },
    });

    await prisma.userNeighborhood.upsert({
      where: {
        userId_neighborhoodId: {
          userId: user.id,
          neighborhoodId,
        },
      },
      update: { isPrimary: true },
      create: {
        userId: user.id,
        neighborhoodId,
        isPrimary: true,
      },
    });

    users.set(account.email, user);
  }

  return users;
}

async function resetPreviousDemoPosts() {
  await prisma.post.deleteMany({
    where: {
      title: {
        startsWith: DEMO_PREFIX,
      },
    },
  });
}

async function createCareRequestPost(params: {
  authorId: string;
  neighborhoodId: string;
  title: string;
  content: string;
  status: CareRequestStatus;
  careType: CareType;
  startsAt: Date;
  endsAt: Date;
  rewardAmount: number;
  isUrgent?: boolean;
}) {
  return prisma.post.create({
    data: {
      authorId: params.authorId,
      neighborhoodId: params.neighborhoodId,
      type: PostType.CARE_REQUEST,
      scope: PostScope.LOCAL,
      status: PostStatus.ACTIVE,
      title: `${DEMO_PREFIX} ${params.title}`,
      content: params.content,
      structuredSearchText: `${params.title}\n${params.content}`,
      careRequest: {
        create: {
          careType: params.careType,
          startsAt: params.startsAt,
          endsAt: params.endsAt,
          locationNote: "케어검증동 주민센터 앞",
          petNote: "중형견, 낯선 사람에게 천천히 접근 필요",
          requirements: "사진 공유와 완료 후 피드백 필수",
          rewardAmount: params.rewardAmount,
          isUrgent: params.isUrgent ?? false,
          status: params.status,
        },
      },
    },
    include: {
      careRequest: true,
    },
  });
}

async function seedCareDemo() {
  assertLocalDevelopmentDatabase(process.env, "care request demo seeding");

  const neighborhood = await upsertDemoNeighborhood();
  const users = await upsertDemoAccounts(neighborhood.id);
  const requester = users.get("care.requester@townpet.dev");
  const caregiver = users.get("care.caregiver@townpet.dev");

  if (!requester || !caregiver) {
    throw new Error("Care demo accounts were not created.");
  }

  await resetPreviousDemoPosts();

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const twoDaysLater = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const completedAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await createCareRequestPost({
    authorId: requester.id,
    neighborhoodId: neighborhood.id,
    title: "산책 요청 OPEN",
    content: "내일 저녁 40분 산책을 도와줄 이웃을 찾습니다.",
    status: CareRequestStatus.OPEN,
    careType: CareType.WALK,
    startsAt: tomorrow,
    endsAt: new Date(tomorrow.getTime() + 60 * 60 * 1000),
    rewardAmount: 15000,
  });

  const matchedPost = await createCareRequestPost({
    authorId: requester.id,
    neighborhoodId: neighborhood.id,
    title: "방문 돌봄 MATCHED",
    content: "퇴근 전 사료 급여와 물 교체를 맡길 수 있는 상태입니다.",
    status: CareRequestStatus.MATCHED,
    careType: CareType.VISIT_CARE,
    startsAt: twoDaysLater,
    endsAt: new Date(twoDaysLater.getTime() + 90 * 60 * 1000),
    rewardAmount: 22000,
  });

  if (!matchedPost.careRequest) {
    throw new Error("Matched care request was not created.");
  }

  await prisma.careApplication.create({
    data: {
      careRequestId: matchedPost.careRequest.id,
      applicantId: caregiver.id,
      message: "동네 거주 중이며 방문 돌봄 경험이 있습니다.",
      status: CareApplicationStatus.ACCEPTED,
      decidedAt: new Date(),
      decidedBy: requester.id,
    },
  });

  const completedPost = await createCareRequestPost({
    authorId: requester.id,
    neighborhoodId: neighborhood.id,
    title: "완료 이슈 신호",
    content: "완료 처리 후 안전 이슈 피드백이 남아 관리자 큐에서 확인해야 합니다.",
    status: CareRequestStatus.COMPLETED,
    careType: CareType.EMERGENCY_CHECK,
    startsAt: completedAt,
    endsAt: new Date(completedAt.getTime() + 45 * 60 * 1000),
    rewardAmount: 30000,
    isUrgent: true,
  });

  if (!completedPost.careRequest) {
    throw new Error("Completed care request was not created.");
  }

  const completedApplication = await prisma.careApplication.create({
    data: {
      careRequestId: completedPost.careRequest.id,
      applicantId: caregiver.id,
      message: "응급 확인 가능, 현장 사진 공유 가능합니다.",
      status: CareApplicationStatus.ACCEPTED,
      decidedAt: completedAt,
      decidedBy: requester.id,
    },
  });

  await prisma.careCompletionFeedback.create({
    data: {
      careRequestId: completedPost.careRequest.id,
      careApplicationId: completedApplication.id,
      authorId: requester.id,
      authorRole: CareFeedbackAuthorRole.REQUESTER,
      outcome: CareFeedbackOutcome.ISSUE,
      issueType: CareFeedbackIssueType.SAFETY,
      reviewStatus: CareFeedbackReviewStatus.PENDING,
      wouldRepeat: false,
      comment: "방문 완료 사진이 늦게 공유되어 안전 확인이 지연되었습니다.",
    },
  });

  const counts = await Promise.all([
    prisma.post.count({ where: { title: { startsWith: DEMO_PREFIX } } }),
    prisma.careRequest.count({
      where: { post: { title: { startsWith: DEMO_PREFIX } } },
    }),
    prisma.careApplication.count({
      where: { careRequest: { post: { title: { startsWith: DEMO_PREFIX } } } },
    }),
    prisma.careCompletionFeedback.count({
      where: { careRequest: { post: { title: { startsWith: DEMO_PREFIX } } } },
    }),
    prisma.careCompletionFeedback.count({
      where: {
        careRequest: { post: { title: { startsWith: DEMO_PREFIX } } },
        reviewStatus: CareFeedbackReviewStatus.PENDING,
      },
    }),
  ]);

  return {
    accounts: careDemoAccounts.map((account) => ({
      email: account.email,
      nickname: account.nickname,
      role: account.role,
      password: DEMO_PASSWORD,
    })),
    neighborhood: {
      city: neighborhood.city,
      district: neighborhood.district,
      name: neighborhood.name,
    },
    urls: {
      feed: "/feed?type=CARE_REQUEST&page=1",
      guestFeed: "/feed/guest?type=CARE_REQUEST&page=1",
      issueQueue: "/admin/care-feedbacks",
      opsOverview: "/admin/ops",
    },
    summary: summarizeCareDemoSeed({
      posts: counts[0],
      requests: counts[1],
      applications: counts[2],
      feedbacks: counts[3],
      pendingReviews: counts[4],
    }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedCareDemo()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error("Seed care demo failed", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
