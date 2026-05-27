import "dotenv/config";

import {
  BoardScope,
  CommonBoardType,
  ItemCondition,
  LostFoundType,
  MarketType,
  PostScope,
  PostStatus,
  PostType,
  PrismaClient,
  UserRole,
} from "@prisma/client";

import { assertDatabaseAccess } from "../src/server/local-database-guard";

export const PUBLIC_SMOKE_FIXTURE_CONFIRM_ENV_KEY = "PUBLIC_SMOKE_FIXTURE_CONFIRM";
export const PUBLIC_SMOKE_FIXTURE_CONFIRM_VALUE = "PUBLISH_PUBLIC_SMOKE_FIXTURES";
export const PUBLIC_SMOKE_FIXTURE_APPLY_ENV_KEY = "PUBLIC_SMOKE_FIXTURE_APPLY";

type PublicSmokeFixtureDraft = {
  type: PostType;
  title: string;
  content: string;
  sourceName: string;
  sourceUrl: string;
};

export const PUBLIC_SMOKE_FIXTURE_DRAFTS: PublicSmokeFixtureDraft[] = [
  {
    type: PostType.LOST_FOUND,
    title: "분실동물 공개 제보 예시와 위치 기준",
    sourceName: "TownPet 분실동물 공개 제보 기준",
    sourceUrl: "https://townpet.vercel.app/guides/lost-pet-first-24-hours",
    content: [
      "분실동물 글은 빠르게 공유하되, 보호자와 제보자의 개인정보를 함께 공개하지 않는 것이 중요합니다.",
      "",
      "공개 글에는 동네명, 공원명, 역명처럼 넓은 기준점을 쓰고, 전화번호나 상세주소는 남기지 않습니다.",
      "목격 시간, 이동 방향, 외형 특징, 착용한 목줄이나 옷처럼 찾는 데 필요한 정보만 정리해 주세요.",
      "",
      "이 글은 실종 신고가 아니라 TownPet 운영자가 smoke와 안내 용도로 유지하는 공개 기준 글입니다.",
    ].join("\n"),
  },
  {
    type: PostType.MARKET_LISTING,
    title: "반려용품 거래 전 확인할 안전 기준",
    sourceName: "TownPet 중고거래 안전 기준",
    sourceUrl: "https://townpet.vercel.app/guides/pet-used-trade-safety",
    content: [
      "반려용품 거래 글은 제품 상태와 반려동물 안전에 직접 연결되는 정보를 먼저 확인해야 합니다.",
      "",
      "사료와 간식은 개봉 여부와 유통기한을 확인하고, 이동장·하네스·의류는 사이즈와 체중 기준을 함께 남겨 주세요.",
      "작동 제품은 충전, 소음, 파손 여부를 확인하고, 직거래 위치는 공개 가능한 넓은 기준점으로만 작성합니다.",
      "",
      "생체 판매, 동물 의약품, 만료 식품 거래는 TownPet에서 허용하지 않습니다.",
    ].join("\n"),
  },
];

type PublishResult = {
  status: "DRY_RUN" | "APPLIED";
  author: {
    id: string;
    nickname: string | null;
    role: UserRole;
  };
  created: Array<{ id: string; title: string; type: PostType }>;
  skipped: Array<{ id: string; title: string; type: PostType }>;
};

function isApplyMode(env: NodeJS.ProcessEnv) {
  return env[PUBLIC_SMOKE_FIXTURE_APPLY_ENV_KEY] === "1";
}

function buildStructuredSearchText(draft: PublicSmokeFixtureDraft) {
  return [draft.title, draft.content, draft.sourceName].join("\n");
}

function getPreferredAuthorWhere(env: NodeJS.ProcessEnv) {
  const email = env.OPERATOR_CONTENT_AUTHOR_EMAIL?.trim();
  if (email) {
    return { email };
  }

  const nickname = env.OPERATOR_CONTENT_AUTHOR_NICKNAME?.trim() || "townpet-admin";
  return { nickname };
}

function buildPostCreateData(draft: PublicSmokeFixtureDraft, authorId: string, index: number) {
  const common = {
    authorId,
    type: draft.type,
    scope: PostScope.GLOBAL,
    status: PostStatus.ACTIVE,
    title: draft.title,
    content: draft.content,
    structuredSearchText: buildStructuredSearchText(draft),
    isOperatorContent: true,
    operatorSourceName: draft.sourceName,
    operatorSourceUrl: draft.sourceUrl,
    operatorLastVerifiedAt: new Date(),
    createdAt: new Date(Date.now() + index * 1000),
  };

  if (draft.type === PostType.LOST_FOUND) {
    return {
      ...common,
      boardScope: BoardScope.COMMON,
      commonBoardType: CommonBoardType.LOST_FOUND,
      lostFoundAlert: {
        create: {
          alertType: LostFoundType.LOST,
          petType: "강아지",
          breed: "믹스",
          lastSeenAt: new Date(),
          lastSeenLocation: "공개 기준 예시 지역",
        },
      },
    };
  }

  return {
    ...common,
    boardScope: BoardScope.COMMON,
    commonBoardType: CommonBoardType.MARKET,
    marketListing: {
      create: {
        listingType: MarketType.SHARE,
        price: 0,
        condition: ItemCondition.GOOD,
      },
    },
  };
}

export async function publishPublicSmokeFixtures(params: {
  prisma: PrismaClient;
  env?: NodeJS.ProcessEnv;
}): Promise<PublishResult> {
  const env = params.env ?? process.env;
  assertDatabaseAccess({
    env,
    confirmEnvKey: PUBLIC_SMOKE_FIXTURE_CONFIRM_ENV_KEY,
    confirmValue: PUBLIC_SMOKE_FIXTURE_CONFIRM_VALUE,
    operationLabel: "public smoke fixture publishing",
  });

  const apply = isApplyMode(env);
  const author =
    (await params.prisma.user.findFirst({
      where: {
        ...getPreferredAuthorWhere(env),
        role: { in: [UserRole.ADMIN, UserRole.MODERATOR] },
      },
      select: { id: true, nickname: true, role: true },
    })) ??
    (await params.prisma.user.findFirst({
      where: { role: { in: [UserRole.ADMIN, UserRole.MODERATOR] } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: { id: true, nickname: true, role: true },
    }));

  if (!author) {
    throw new Error("No ADMIN or MODERATOR author found for public smoke fixture publishing.");
  }

  const existing = await params.prisma.post.findMany({
    where: {
      title: { in: PUBLIC_SMOKE_FIXTURE_DRAFTS.map((draft) => draft.title) },
      isOperatorContent: true,
      status: { not: PostStatus.DELETED },
    },
    select: { id: true, title: true, type: true },
  });
  const existingByTitle = new Map(existing.map((post) => [post.title, post]));
  const draftsToCreate = PUBLIC_SMOKE_FIXTURE_DRAFTS.filter(
    (draft) => !existingByTitle.has(draft.title),
  );

  if (!apply) {
    return {
      status: "DRY_RUN",
      author,
      created: draftsToCreate.map((draft) => ({
        id: "(dry-run)",
        title: draft.title,
        type: draft.type,
      })),
      skipped: existing.map((post) => ({ id: post.id, title: post.title, type: post.type })),
    };
  }

  const created = await params.prisma.$transaction(
    draftsToCreate.map((draft, index) =>
      params.prisma.post.create({
        data: buildPostCreateData(draft, author.id, index),
        select: { id: true, title: true, type: true },
      }),
    ),
  );

  return {
    status: "APPLIED",
    author,
    created,
    skipped: existing.map((post) => ({ id: post.id, title: post.title, type: post.type })),
  };
}

export function formatPublishPublicSmokeFixtureResult(result: PublishResult) {
  const lines = [
    "Public smoke fixture publishing",
    `- status: ${result.status}`,
    `- author: ${result.author.nickname ?? result.author.id} (${result.author.role})`,
    `- created: ${result.created.length}`,
    `- skippedExisting: ${result.skipped.length}`,
    "- created items:",
    ...(result.created.length > 0
      ? result.created.map((item) => `  - ${item.id} | ${item.type} | ${item.title}`)
      : ["  - none"]),
    "- skipped items:",
    ...(result.skipped.length > 0
      ? result.skipped.map((item) => `  - ${item.id} | ${item.type} | ${item.title}`)
      : ["  - none"]),
  ];

  return lines.join("\n");
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await publishPublicSmokeFixtures({ prisma });
    console.log(formatPublishPublicSmokeFixtureResult(result));
  } finally {
    await prisma.$disconnect();
  }
}

if (process.env.NODE_ENV !== "test" && require.main === module) {
  main().catch((error) => {
    console.error("Public smoke fixture publishing failed");
    console.error(error);
    process.exit(1);
  });
}
