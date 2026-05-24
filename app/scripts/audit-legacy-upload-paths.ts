import "dotenv/config";

import { Prisma, PrismaClient } from "@prisma/client";

import { assertDatabaseAccess } from "../src/server/local-database-guard";

export const LEGACY_UPLOAD_PATH_AUDIT_CONFIRM_ENV_KEY = "LEGACY_UPLOAD_PATH_AUDIT_CONFIRM";
export const LEGACY_UPLOAD_PATH_AUDIT_CONFIRM_VALUE = "LEGACY_UPLOAD_PATH_AUDIT";
export const DEFAULT_LEGACY_UPLOAD_PATH_AUDIT_LIMIT = 20;
export const LEGACY_DOUBLE_MEDIA_UPLOAD_PATTERN = "/media/media/uploads/";

type CandidatePost = {
  id: string;
  title: string;
  status: string;
  type: string;
  scope: string;
  createdAt: Date;
  content: string;
  _count: {
    comments: number;
    reports: number;
  };
};

type CandidatePostImage = {
  id: string;
  postId: string;
  url: string;
  order: number;
  post: {
    title: string;
    status: string;
    type: string;
  };
};

type CandidateComment = {
  id: string;
  postId: string;
  content: string;
  status: string;
  createdAt: Date;
};

export type LegacyUploadPathAuditResult = {
  generatedAt: string;
  mode: "read-only";
  pattern: string;
  limit: number;
  counts: {
    postContents: number;
    postImages: number;
    commentContents: number;
  };
  samples: {
    postContents: CandidatePost[];
    postImages: CandidatePostImage[];
    commentContents: CandidateComment[];
  };
};

function containsLegacyUploadPathFilter() {
  return {
    contains: LEGACY_DOUBLE_MEDIA_UPLOAD_PATTERN,
    mode: Prisma.QueryMode.insensitive,
  };
}

export function normalizeLegacyUploadPathAuditLimit(value: string | undefined) {
  if (!value) {
    return DEFAULT_LEGACY_UPLOAD_PATH_AUDIT_LIMIT;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
    throw new Error("LEGACY_UPLOAD_PATH_AUDIT_LIMIT must be an integer from 1 to 100.");
  }

  return parsed;
}

export function buildPostContentCandidateWhere(): Prisma.PostWhereInput {
  return {
    content: containsLegacyUploadPathFilter(),
  };
}

export function buildPostImageCandidateWhere(): Prisma.PostImageWhereInput {
  return {
    url: containsLegacyUploadPathFilter(),
  };
}

export function buildCommentContentCandidateWhere(): Prisma.CommentWhereInput {
  return {
    content: containsLegacyUploadPathFilter(),
  };
}

export function countLegacyUploadPathOccurrences(value: string) {
  if (!value) {
    return 0;
  }

  return value
    .toLowerCase()
    .split(LEGACY_DOUBLE_MEDIA_UPLOAD_PATTERN.toLowerCase()).length - 1;
}

function truncate(value: string, maxLength = 110) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

function formatEmptySection(message: string) {
  return [`- ${message}`];
}

export function formatLegacyUploadPathAuditReport(result: LegacyUploadPathAuditResult) {
  const postContentLines = result.samples.postContents.length
    ? result.samples.postContents.map(
        (post) =>
          `- ${post.id} | ${post.status}/${post.type}/${post.scope} | matches=${countLegacyUploadPathOccurrences(post.content)} | comments=${post._count.comments} reports=${post._count.reports} | ${truncate(post.title)}`,
      )
    : formatEmptySection("No post content samples.");

  const postImageLines = result.samples.postImages.length
    ? result.samples.postImages.map(
        (image) =>
          `- ${image.id} | post=${image.postId} | order=${image.order} | postStatus=${image.post.status}/${image.post.type} | ${truncate(image.url)}`,
      )
    : formatEmptySection("No post image samples.");

  const commentLines = result.samples.commentContents.length
    ? result.samples.commentContents.map(
        (comment) =>
          `- ${comment.id} | post=${comment.postId} | ${comment.status} | matches=${countLegacyUploadPathOccurrences(comment.content)} | ${truncate(comment.content)}`,
      )
    : formatEmptySection("No comment content samples.");

  const lines = [
    "# Legacy Upload Path Audit",
    "",
    `- generatedAt: ${result.generatedAt}`,
    `- mode: ${result.mode}`,
    `- pattern: ${result.pattern}`,
    `- limit: ${result.limit}`,
    `- postContents: ${result.counts.postContents}`,
    `- postImages: ${result.counts.postImages}`,
    `- commentContents: ${result.counts.commentContents}`,
    "",
    "## Post Content Samples",
    ...postContentLines,
    "",
    "## Post Image Samples",
    ...postImageLines,
    "",
    "## Comment Content Samples",
    ...commentLines,
    "",
    "## Next Step",
    "- This report is read-only. Do not mutate production data from this audit command.",
    "- If any count is non-zero, create a separate cleanup plan with dry-run output and explicit approval.",
  ];

  return `${lines.join("\n")}\n`;
}

async function runAudit() {
  assertDatabaseAccess({
    confirmEnvKey: LEGACY_UPLOAD_PATH_AUDIT_CONFIRM_ENV_KEY,
    confirmValue: LEGACY_UPLOAD_PATH_AUDIT_CONFIRM_VALUE,
    operationLabel: "legacy upload path audit",
  });

  const limit = normalizeLegacyUploadPathAuditLimit(process.env.LEGACY_UPLOAD_PATH_AUDIT_LIMIT);
  const prisma = new PrismaClient();

  try {
    const postContentWhere = buildPostContentCandidateWhere();
    const postImageWhere = buildPostImageCandidateWhere();
    const commentContentWhere = buildCommentContentCandidateWhere();

    const [postContentCount, postImageCount, commentContentCount, postContents, postImages, commentContents] =
      await Promise.all([
        prisma.post.count({ where: postContentWhere }),
        prisma.postImage.count({ where: postImageWhere }),
        prisma.comment.count({ where: commentContentWhere }),
        prisma.post.findMany({
          where: postContentWhere,
          orderBy: { createdAt: "desc" },
          take: limit,
          select: {
            id: true,
            title: true,
            status: true,
            type: true,
            scope: true,
            createdAt: true,
            content: true,
            _count: {
              select: {
                comments: true,
                reports: true,
              },
            },
          },
        }),
        prisma.postImage.findMany({
          where: postImageWhere,
          orderBy: [{ postId: "asc" }, { order: "asc" }],
          take: limit,
          select: {
            id: true,
            postId: true,
            url: true,
            order: true,
            post: {
              select: {
                title: true,
                status: true,
                type: true,
              },
            },
          },
        }),
        prisma.comment.findMany({
          where: commentContentWhere,
          orderBy: { createdAt: "desc" },
          take: limit,
          select: {
            id: true,
            postId: true,
            content: true,
            status: true,
            createdAt: true,
          },
        }),
      ]);

    const result: LegacyUploadPathAuditResult = {
      generatedAt: new Date().toISOString(),
      mode: "read-only",
      pattern: LEGACY_DOUBLE_MEDIA_UPLOAD_PATTERN,
      limit,
      counts: {
        postContents: postContentCount,
        postImages: postImageCount,
        commentContents: commentContentCount,
      },
      samples: {
        postContents,
        postImages,
        commentContents,
      },
    };

    process.stdout.write(formatLegacyUploadPathAuditReport(result));
  } finally {
    await prisma.$disconnect();
  }
}

if (process.env.NODE_ENV !== "test" && process.argv[1]?.endsWith("audit-legacy-upload-paths.ts")) {
  runAudit().catch((error) => {
    console.error("Legacy upload path audit failed");
    console.error(error);
    process.exit(1);
  });
}
