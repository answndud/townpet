import "dotenv/config";

import { Prisma, PrismaClient } from "@prisma/client";

import { assertDatabaseAccess } from "../src/server/local-database-guard";

export const DEMO_CONTENT_AUDIT_CONFIRM_ENV_KEY = "DEMO_CONTENT_AUDIT_CONFIRM";
export const DEMO_CONTENT_AUDIT_CONFIRM_VALUE = "DEMO_CONTENT_AUDIT";

export const DEFAULT_DEMO_CONTENT_AUDIT_LIMIT = 20;

export const DEMO_CONTENT_SIGNAL_TERMS = [
  "샘플·",
  "[샘플",
  "[PW",
  "PW SEARCH",
  "[VISUAL SMOKE]",
  "visual-smoke",
  "E2E",
  "playwright",
  "townpet-demo",
  "adoption-demo",
  "test-user",
  "비회원E2E",
] as const;

type CandidateUser = {
  id: string;
  email: string;
  nickname: string | null;
  createdAt: Date;
  _count: {
    posts: number;
    comments: number;
  };
};

type CandidatePost = {
  id: string;
  title: string;
  status: string;
  type: string;
  scope: string;
  createdAt: Date;
  author: {
    email: string;
    nickname: string | null;
  };
  _count: {
    comments: number;
    reports: number;
  };
};

type CandidateComment = {
  id: string;
  postId: string;
  content: string;
  status: string;
  createdAt: Date;
  author: {
    email: string;
    nickname: string | null;
  };
};

export type DemoContentAuditResult = {
  generatedAt: string;
  mode: "read-only";
  limit: number;
  emailDomain: string | null;
  signals: readonly string[];
  counts: {
    users: number;
    posts: number;
    comments: number;
  };
  samples: {
    users: CandidateUser[];
    posts: CandidatePost[];
    comments: CandidateComment[];
  };
};

function containsFilter(value: string) {
  return { contains: value, mode: Prisma.QueryMode.insensitive };
}

function buildStringFieldFilters(fieldName: string, signals: readonly string[]) {
  return signals.map((signal) => ({
    [fieldName]: containsFilter(signal),
  }));
}

export function normalizeAuditLimit(value: string | undefined) {
  if (!value) {
    return DEFAULT_DEMO_CONTENT_AUDIT_LIMIT;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
    throw new Error("DEMO_CONTENT_AUDIT_LIMIT must be an integer from 1 to 100.");
  }

  return parsed;
}

export function buildUserCandidateWhere(params: {
  signals?: readonly string[];
  emailDomain?: string | null;
}): Prisma.UserWhereInput {
  const signals = params.signals ?? DEMO_CONTENT_SIGNAL_TERMS;
  const emailDomain = params.emailDomain?.trim().toLowerCase();

  const clauses: Prisma.UserWhereInput[] = [
    ...buildStringFieldFilters("email", signals),
    ...buildStringFieldFilters("nickname", signals),
  ];

  if (emailDomain) {
    clauses.push({ email: { endsWith: `@${emailDomain}`, mode: Prisma.QueryMode.insensitive } });
  }

  return { OR: clauses };
}

export function buildPostCandidateWhere(params: {
  signals?: readonly string[];
  emailDomain?: string | null;
}): Prisma.PostWhereInput {
  const signals = params.signals ?? DEMO_CONTENT_SIGNAL_TERMS;

  return {
    OR: [
      ...buildStringFieldFilters("title", signals),
      ...buildStringFieldFilters("content", signals),
      ...buildStringFieldFilters("structuredSearchText", signals),
      {
        author: buildUserCandidateWhere({
          signals,
          emailDomain: params.emailDomain,
        }),
      },
      {
        guestAuthor: {
          OR: [...buildStringFieldFilters("displayName", signals)],
        },
      },
    ],
  };
}

export function buildCommentCandidateWhere(params: {
  signals?: readonly string[];
  emailDomain?: string | null;
}): Prisma.CommentWhereInput {
  const signals = params.signals ?? DEMO_CONTENT_SIGNAL_TERMS;

  return {
    OR: [
      ...buildStringFieldFilters("content", signals),
      {
        author: buildUserCandidateWhere({
          signals,
          emailDomain: params.emailDomain,
        }),
      },
      {
        guestAuthor: {
          OR: [...buildStringFieldFilters("displayName", signals)],
        },
      },
    ],
  };
}

function truncate(value: string, maxLength = 96) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

export function formatDemoContentAuditReport(result: DemoContentAuditResult) {
  const lines = [
    "# Demo/E2E Content Audit",
    "",
    `- generatedAt: ${result.generatedAt}`,
    `- mode: ${result.mode}`,
    `- limit: ${result.limit}`,
    `- emailDomain: ${result.emailDomain ?? "-"}`,
    `- users: ${result.counts.users}`,
    `- posts: ${result.counts.posts}`,
    `- comments: ${result.counts.comments}`,
    "",
    "## Signals",
    ...result.signals.map((signal) => `- ${signal}`),
    "",
    "## User Samples",
    ...result.samples.users.map(
      (user) =>
        `- ${user.id} | ${user.email} | ${user.nickname ?? "-"} | posts=${user._count.posts} comments=${user._count.comments}`,
    ),
    "",
    "## Post Samples",
    ...result.samples.posts.map(
      (post) =>
        `- ${post.id} | ${post.status}/${post.type}/${post.scope} | ${truncate(post.title)} | author=${post.author.nickname ?? post.author.email} | comments=${post._count.comments} reports=${post._count.reports}`,
    ),
    "",
    "## Comment Samples",
    ...result.samples.comments.map(
      (comment) =>
        `- ${comment.id} | post=${comment.postId} | ${comment.status} | author=${comment.author.nickname ?? comment.author.email} | ${truncate(comment.content)}`,
    ),
    "",
    "## Next Step",
    "- This report is read-only. Do not delete or hide content until a human approves the candidate list.",
  ];

  return `${lines.join("\n")}\n`;
}

async function runAudit() {
  assertDatabaseAccess({
    confirmEnvKey: DEMO_CONTENT_AUDIT_CONFIRM_ENV_KEY,
    confirmValue: DEMO_CONTENT_AUDIT_CONFIRM_VALUE,
    operationLabel: "demo/E2E content audit",
  });

  const limit = normalizeAuditLimit(process.env.DEMO_CONTENT_AUDIT_LIMIT);
  const emailDomain = process.env.DEMO_CONTENT_EMAIL_DOMAIN?.trim().toLowerCase() || null;
  const prisma = new PrismaClient();

  try {
    const userWhere = buildUserCandidateWhere({ emailDomain });
    const postWhere = buildPostCandidateWhere({ emailDomain });
    const commentWhere = buildCommentCandidateWhere({ emailDomain });

    const [userCount, postCount, commentCount, users, posts, comments] = await Promise.all([
      prisma.user.count({ where: userWhere }),
      prisma.post.count({ where: postWhere }),
      prisma.comment.count({ where: commentWhere }),
      prisma.user.findMany({
        where: userWhere,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          email: true,
          nickname: true,
          createdAt: true,
          _count: {
            select: {
              posts: true,
              comments: true,
            },
          },
        },
      }),
      prisma.post.findMany({
        where: postWhere,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          title: true,
          status: true,
          type: true,
          scope: true,
          createdAt: true,
          author: {
            select: {
              email: true,
              nickname: true,
            },
          },
          _count: {
            select: {
              comments: true,
              reports: true,
            },
          },
        },
      }),
      prisma.comment.findMany({
        where: commentWhere,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          postId: true,
          content: true,
          status: true,
          createdAt: true,
          author: {
            select: {
              email: true,
              nickname: true,
            },
          },
        },
      }),
    ]);

    const result: DemoContentAuditResult = {
      generatedAt: new Date().toISOString(),
      mode: "read-only",
      limit,
      emailDomain,
      signals: DEMO_CONTENT_SIGNAL_TERMS,
      counts: {
        users: userCount,
        posts: postCount,
        comments: commentCount,
      },
      samples: {
        users,
        posts,
        comments,
      },
    };

    process.stdout.write(formatDemoContentAuditReport(result));
  } finally {
    await prisma.$disconnect();
  }
}

if (process.env.NODE_ENV !== "test" && process.argv[1]?.endsWith("audit-demo-content-candidates.ts")) {
  runAudit().catch((error) => {
    console.error("Demo/E2E content audit failed");
    console.error(error);
    process.exit(1);
  });
}
