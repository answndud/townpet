import "dotenv/config";
import { PrismaClient } from "@prisma/client";

type GuestAuthorBackfillTable = "Post" | "Comment";
type GuestAuthorBackfillPrisma = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  guestAuthor: { count(): Promise<number> };
  post: { count(args: { where: { guestAuthorId: { not: null } } }): Promise<number> };
  comment: { count(args: { where: { guestAuthorId: { not: null } } }): Promise<number> };
  $disconnect(): Promise<void>;
};

export type GuestAuthorBackfillVerificationPayload = {
  postRemaining: number;
  commentRemaining: number;
  guestAuthors: number;
  guestPosts: number;
  guestComments: number;
  legacyColumnsPresent: boolean;
  complete: boolean;
};

async function tableHasColumn(
  prisma: Pick<GuestAuthorBackfillPrisma, "$queryRawUnsafe">,
  table: GuestAuthorBackfillTable,
  column: string,
) {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `
    SELECT EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
    ) AS exists
  `,
    table,
    column,
  );
  return Boolean(rows[0]?.exists);
}

async function countRemainingBackfill(
  prisma: Pick<GuestAuthorBackfillPrisma, "$queryRawUnsafe">,
  table: GuestAuthorBackfillTable,
) {
  const sql = `
    SELECT COUNT(*)::int AS count
    FROM "${table}"
    WHERE "guestAuthorId" IS NULL
      AND "guestPasswordHash" IS NOT NULL
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(sql);
  return Number(rows[0]?.count ?? 0);
}

export async function verifyGuestAuthorBackfill(
  prisma: GuestAuthorBackfillPrisma,
): Promise<GuestAuthorBackfillVerificationPayload> {
  const [hasPostLegacy, hasCommentLegacy, guestAuthors, guestPosts, guestComments] =
    await Promise.all([
      tableHasColumn(prisma, "Post", "guestPasswordHash"),
      tableHasColumn(prisma, "Comment", "guestPasswordHash"),
      prisma.guestAuthor.count(),
      prisma.post.count({ where: { guestAuthorId: { not: null } } }),
      prisma.comment.count({ where: { guestAuthorId: { not: null } } }),
    ]);

  const postRemaining = hasPostLegacy ? await countRemainingBackfill(prisma, "Post") : 0;
  const commentRemaining = hasCommentLegacy ? await countRemainingBackfill(prisma, "Comment") : 0;

  return {
    postRemaining,
    commentRemaining,
    guestAuthors,
    guestPosts,
    guestComments,
    legacyColumnsPresent: hasPostLegacy || hasCommentLegacy,
    complete: postRemaining === 0 && commentRemaining === 0,
  };
}

async function main(prisma: GuestAuthorBackfillPrisma = new PrismaClient()) {
  const payload = await verifyGuestAuthorBackfill(prisma);
  console.log(JSON.stringify(payload));
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("verify-guest-author-backfill.ts")
) {
  const prisma = new PrismaClient();
  main(prisma)
    .catch((error) => {
      console.error("Guest author verification failed", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
