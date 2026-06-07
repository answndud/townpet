import "dotenv/config";

import { PostScope, PostStatus, PostType, PrismaClient, UserRole } from "@prisma/client";

import { assertDatabaseAccess } from "../src/server/local-database-guard";

export const OPERATOR_CONTENT_PUBLISH_CONFIRM_ENV_KEY = "OPERATOR_CONTENT_PUBLISH_CONFIRM";
export const OPERATOR_CONTENT_PUBLISH_CONFIRM_VALUE = "PUBLISH_OPERATOR_CONTENT";
export const OPERATOR_CONTENT_PUBLISH_APPLY_ENV_KEY = "OPERATOR_CONTENT_PUBLISH_APPLY";

type OperatorContentDraft = {
  slot: string;
  type: PostType;
  title: string;
  content: string;
  sourceName: string;
  sourceUrl: string;
};

export const OPERATOR_CONTENT_DRAFTS: OperatorContentDraft[] = [
  {
    slot: "L1",
    type: PostType.FREE_BOARD,
    title: "반려생활 정보는 이렇게 모읍니다",
    sourceName: "TownPet 운영 기준",
    sourceUrl: "https://townpet.vercel.app/campaigns/neighborhood-map",
    content: [
      "TownPet은 반려동물 이야기를 넓게 모으는 곳이 아니라, 동네에서 반복해서 필요한 반려생활 정보를 찾기 쉽게 쌓는 서비스입니다.",
      "",
      "우선 아래 정보를 중심으로 모읍니다.",
      "",
      "- 동물병원 방문 전 확인할 것",
      "- 산책코스의 혼잡 시간, 목줄 주의 구간, 물 마실 곳",
      "- 분실동물 목격 제보를 남길 때 공개해도 되는 위치",
      "- 반려용품 중고거래에서 확인해야 할 상태와 안전 기준",
      "",
      "운영자가 정리한 글에는 `운영자 정리` 표시와 출처가 함께 붙습니다. 사용자 경험담과 운영자 확인 정보를 구분하기 위한 표시입니다.",
      "",
      "정보가 비어 있는 주제가 보이면 새 글로 제보해 주세요. 방문, 신청, 이동 전에는 원문과 현장 상황을 다시 확인해 주세요.",
    ].join("\n"),
  },
  {
    slot: "L2",
    type: PostType.FREE_BOARD,
    title: "분실동물 제보 전 공개 위치 작성 기준",
    sourceName: "TownPet 분실동물 가이드",
    sourceUrl: "https://townpet.vercel.app/guides/lost-pet-first-24-hours",
    content: [
      "분실동물 제보는 빠른 공유가 중요하지만, 보호자와 제보자의 개인정보가 함께 공개되지 않도록 조심해야 합니다.",
      "",
      "공개 글에는 아래 수준의 위치만 남겨 주세요.",
      "",
      "- 동네명",
      "- 공원, 역, 상가명처럼 넓은 기준점",
      "- 시간대와 이동 방향",
      "- 동물의 외형, 착용한 목줄이나 옷, 눈에 띄는 특징",
      "",
      "아래 정보는 공개 글에 쓰지 않는 편이 안전합니다.",
      "",
      "- 전화번호, 이메일, 오픈채팅, 메신저 ID",
      "- 도로명·번지 주소",
      "- 집 앞, 현관, 동·호수처럼 거주지를 추정할 수 있는 표현",
      "- 특정인을 의심하거나 책임자로 단정하는 표현",
      "",
      "상세한 제보가 필요한 경우에는 보호자 공개 제보 기능이나 운영자 안내를 사용해 주세요. 공개 위치는 찾는 데 필요한 만큼만, 개인정보는 최소한으로 남기는 것이 기준입니다.",
    ].join("\n"),
  },
  {
    slot: "H1",
    type: PostType.FREE_BOARD,
    title: "24시/야간 동물병원 확인 전 체크리스트",
    sourceName: "TownPet 24시 동물병원 가이드",
    sourceUrl: "https://townpet.vercel.app/guides/24h-vet-checklist",
    content: [
      "야간이나 휴일에 병원을 찾을 때는 글이나 검색 결과만 보고 바로 이동하기보다, 출발 전에 전화로 확인하는 것이 안전합니다.",
      "",
      "전화 전에 정리할 것:",
      "",
      "- 반려동물 종류와 나이",
      "- 증상이 시작된 시간",
      "- 먹은 것, 다친 상황, 호흡·보행 상태",
      "- 현재 이동 가능한 거리",
      "",
      "전화로 확인할 것:",
      "",
      "- 지금 진료 접수가 가능한지",
      "- 응급 대응이나 야간 진료 범위가 있는지",
      "- 대기 시간이 길 수 있는지",
      "- 방문 전에 준비할 사진, 영상, 기록이 있는지",
      "",
      "TownPet의 병원 글은 진료 가능 여부를 확정하지 않습니다. 운영자 정리 글도 방문 전 확인 항목을 돕기 위한 안내이며, 실제 운영 시간과 접수 가능 여부는 병원에 다시 확인해 주세요.",
    ].join("\n"),
  },
  {
    slot: "W1",
    type: PostType.WALK_ROUTE,
    title: "산책코스 제보에 꼭 필요한 6가지",
    sourceName: "TownPet 산책코스 작성 기준",
    sourceUrl: "https://townpet.vercel.app/posts/new?type=WALK_ROUTE&template=walk_route_large_dog",
    content: [
      "산책코스 글은 “좋다”는 한 줄보다, 다른 보호자가 실제로 준비할 수 있는 정보가 있을 때 더 도움이 됩니다.",
      "",
      "제보할 때 아래 6가지를 함께 남겨 주세요.",
      "",
      "1. 산책 구간의 넓은 기준점",
      "2. 혼잡한 시간대",
      "3. 목줄을 특히 신경 써야 하는 구간",
      "4. 물 마실 곳이나 배변봉투함 여부",
      "5. 차량, 자전거, 계단, 미끄러운 바닥 같은 주의 지점",
      "6. 소형견, 대형견, 노령견에게 다르게 느껴질 수 있는 점",
      "",
      "집 앞 위치나 야간에 위험할 수 있는 정밀 위치는 공개하지 않는 편이 좋습니다. 산책 정보는 함께 쓰기 위한 정보이므로, 사유지 출입이나 규정 위반을 유도하는 표현은 피해주세요.",
    ].join("\n"),
  },
  {
    slot: "L3",
    type: PostType.FREE_BOARD,
    title: "분실동물 첫 24시간에 해야 할 일",
    sourceName: "TownPet 분실동물 첫 24시간 가이드",
    sourceUrl: "https://townpet.vercel.app/guides/lost-pet-first-24-hours",
    content: [
      "반려동물을 잃어버렸을 때는 첫 24시간의 기록이 중요합니다. 당황한 상태에서도 아래 순서대로 남기면 제보를 정리하기 쉬워집니다.",
      "",
      "먼저 정리할 것:",
      "",
      "- 마지막으로 본 위치와 시간",
      "- 이동 방향",
      "- 동물의 종류, 크기, 색, 착용한 물건",
      "- 최근 사진",
      "- 낯선 사람을 피하는지, 이름에 반응하는지",
      "",
      "공유할 때 주의할 것:",
      "",
      "- 공개 글에는 연락처와 상세주소를 넣지 않습니다.",
      "- 목격 위치는 동네명, 공원명, 역명처럼 넓은 기준으로 씁니다.",
      "- 특정인을 의심하거나 책임자로 단정하지 않습니다.",
      "- 새 목격 제보가 들어오면 시간순으로 정리합니다.",
      "",
      "TownPet의 분실동물 글은 보호자와 제보자의 개인정보를 줄이면서 목격 정보를 모으는 것을 우선합니다.",
    ].join("\n"),
  },
  {
    slot: "H2",
    type: PostType.FREE_BOARD,
    title: "병원 후기를 안전하게 남기는 방법",
    sourceName: "TownPet 병원 후기 작성 기준",
    sourceUrl: "https://townpet.vercel.app/guides/pet-hospital-review-policy",
    content: [
      "병원 후기는 다른 보호자에게 도움이 될 수 있지만, 의료 판단이나 비방으로 읽히지 않게 작성하는 것이 중요합니다.",
      "",
      "도움 되는 후기:",
      "",
      "- 방문 목적",
      "- 대기 시간",
      "- 설명을 들은 방식",
      "- 비용을 안내받은 시점",
      "- 반려동물의 종류와 상황",
      "- 다시 확인하고 싶은 점",
      "",
      "피해야 할 표현:",
      "",
      "- “무조건”, “절대”, “최고”, “최악” 같은 단정",
      "- 의료 과실이나 책임을 확정하는 표현",
      "- 확인되지 않은 가격, 운영 시간, 진료 가능 여부",
      "- 직원이나 수의사를 특정해 비난하는 표현",
      "",
      "후기는 경험 공유이지 진단·처방 판단이 아닙니다. 병원 정보가 틀렸거나 바뀐 경우에는 후기 본문에서 단정하기보다 정정 요청으로 알려주세요.",
    ].join("\n"),
  },
  {
    slot: "W2",
    type: PostType.WALK_ROUTE,
    title: "야간 산책 전 확인할 것",
    sourceName: "TownPet 산책코스 작성 기준",
    sourceUrl: "https://townpet.vercel.app/posts/new?type=WALK_ROUTE&template=walk_route_large_dog",
    content: [
      "야간 산책은 낮 산책과 확인할 점이 다릅니다. 같은 길이어도 조명, 차량, 자전거, 사람 흐름에 따라 체감 위험이 달라질 수 있습니다.",
      "",
      "제보할 때 도움이 되는 정보:",
      "",
      "- 조명이 충분한 구간과 어두운 구간",
      "- 차량이나 자전거가 갑자기 가까워지는 지점",
      "- 바닥이 미끄럽거나 턱이 있는 구간",
      "- 사람이 몰리는 시간대",
      "- 배변 처리나 물 마실 곳을 확인하기 쉬운지",
      "- 소형견, 대형견, 노령견이 다르게 느낄 수 있는 점",
      "",
      "야간 산책 글에는 집 앞 출발점이나 상세주소를 쓰지 않는 편이 좋습니다. 다른 보호자가 참고할 수 있는 넓은 기준점과 주의할 조건을 중심으로 남겨 주세요.",
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

function buildStructuredSearchText(draft: OperatorContentDraft) {
  return [draft.title, draft.content, draft.sourceName].join("\n");
}

function isApplyMode(env: NodeJS.ProcessEnv) {
  return env[OPERATOR_CONTENT_PUBLISH_APPLY_ENV_KEY] === "1";
}

function getPreferredAuthorWhere(env: NodeJS.ProcessEnv) {
  const email = env.OPERATOR_CONTENT_AUTHOR_EMAIL?.trim();
  if (email) {
    return { email };
  }

  const nickname = env.OPERATOR_CONTENT_AUTHOR_NICKNAME?.trim() || "ops-admin";
  return { nickname };
}

export async function publishOperatorContentDrafts(params: {
  prisma: PrismaClient;
  env?: NodeJS.ProcessEnv;
}): Promise<PublishResult> {
  const env = params.env ?? process.env;
  assertDatabaseAccess({
    env,
    confirmEnvKey: OPERATOR_CONTENT_PUBLISH_CONFIRM_ENV_KEY,
    confirmValue: OPERATOR_CONTENT_PUBLISH_CONFIRM_VALUE,
    operationLabel: "operator content publishing",
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
    throw new Error("No ADMIN or MODERATOR author found for operator content publishing.");
  }

  const existing = await params.prisma.post.findMany({
    where: {
      title: { in: OPERATOR_CONTENT_DRAFTS.map((draft) => draft.title) },
      isOperatorContent: true,
      status: { not: PostStatus.DELETED },
    },
    select: { id: true, title: true, type: true },
  });
  const existingByTitle = new Map(existing.map((post) => [post.title, post]));
  const draftsToCreate = OPERATOR_CONTENT_DRAFTS.filter(
    (draft) => !existingByTitle.has(draft.title),
  );

  if (!apply) {
    return {
      status: "DRY_RUN",
      author,
      created: draftsToCreate.map((draft) => ({ id: "(dry-run)", title: draft.title, type: draft.type })),
      skipped: existing.map((post) => ({ id: post.id, title: post.title, type: post.type })),
    };
  }

  const created = await params.prisma.$transaction(
    draftsToCreate.map((draft, index) =>
      params.prisma.post.create({
        data: {
          authorId: author.id,
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
          ...(draft.type === PostType.WALK_ROUTE
            ? {
                walkRoute: {
                  create: {
                    routeName: draft.title,
                    coordinates: [],
                    cautionNote: "전국 공통 산책 정보 작성 기준입니다. 실제 위치는 제보자가 확인 후 작성합니다.",
                  },
                },
              }
            : {}),
        },
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

export function formatPublishOperatorContentResult(result: PublishResult) {
  const lines = [
    "Operator content publishing",
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

export async function main(prisma: PrismaClient = new PrismaClient(), env: NodeJS.ProcessEnv = process.env) {
  try {
    const result = await publishOperatorContentDrafts({ prisma, env });
    const output = formatPublishOperatorContentResult(result);
    console.log(output);
    return output;
  } finally {
    await prisma.$disconnect();
  }
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("publish-operator-content-drafts.ts")
) {
  const prisma = new PrismaClient();
  main(prisma).catch((error) => {
    console.error("Operator content publishing failed");
    console.error(error);
    process.exit(1);
  });
}
