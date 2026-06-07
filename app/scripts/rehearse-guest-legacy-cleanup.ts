import "dotenv/config";
import { PrismaClient } from "@prisma/client";

export const EXPECTED_ROLLBACK_ERROR = "GUEST_LEGACY_CLEANUP_REHEARSAL_ROLLBACK";
const LEGACY_COLUMNS = [
  "guestDisplayName",
  "guestIpDisplay",
  "guestIpLabel",
  "guestPasswordHash",
  "guestIpHash",
  "guestFingerprintHash",
] as const;

type LegacyTable = "Post" | "Comment";
type RehearsalTx = {
  $executeRawUnsafe(query: string): Promise<unknown>;
};
type GuestLegacyCleanupRehearsalPrisma = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $transaction(callback: (tx: RehearsalTx) => Promise<unknown>): Promise<unknown>;
  $disconnect(): Promise<void>;
};

type PendingBackfill = {
  postRemaining: number;
  commentRemaining: number;
};

type RehearsalResult =
  | {
      ok: false;
      reason: "BACKFILL_INCOMPLETE";
      postRemaining: number;
      commentRemaining: number;
      shouldExitFailure: true;
    }
  | {
      ok: true;
      rehearsal: "drop-legacy-guest-columns";
      rollback: true;
      skipped: "LEGACY_COLUMNS_ALREADY_DROPPED";
      shouldExitFailure: false;
    }
  | {
      ok: false;
      reason: "REHEARSAL_DID_NOT_ROLLBACK";
      shouldExitFailure: true;
    }
  | {
      ok: true;
      rehearsal: "drop-legacy-guest-columns";
      rollback: true;
      shouldExitFailure: false;
    };

async function tableHasColumn(
  prisma: Pick<GuestLegacyCleanupRehearsalPrisma, "$queryRawUnsafe">,
  table: LegacyTable,
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

async function countPendingBackfill(
  prisma: Pick<GuestLegacyCleanupRehearsalPrisma, "$queryRawUnsafe">,
): Promise<PendingBackfill> {
  const [hasPostLegacy, hasCommentLegacy] = await Promise.all([
    tableHasColumn(prisma, "Post", "guestPasswordHash"),
    tableHasColumn(prisma, "Comment", "guestPasswordHash"),
  ]);

  if (!hasPostLegacy && !hasCommentLegacy) {
    return { postRemaining: 0, commentRemaining: 0 };
  }

  const [postRemainingRows, commentRemainingRows] = await Promise.all([
    hasPostLegacy
      ? prisma.$queryRawUnsafe<Array<{ count: number }>>(
          `
          SELECT COUNT(*)::int AS count
          FROM "Post"
          WHERE "guestAuthorId" IS NULL
            AND "guestPasswordHash" IS NOT NULL
        `,
        )
      : Promise.resolve([{ count: 0 }]),
    hasCommentLegacy
      ? prisma.$queryRawUnsafe<Array<{ count: number }>>(
          `
          SELECT COUNT(*)::int AS count
          FROM "Comment"
          WHERE "guestAuthorId" IS NULL
            AND "guestPasswordHash" IS NOT NULL
        `,
        )
      : Promise.resolve([{ count: 0 }]),
  ]);

  const postRemaining = Number(postRemainingRows[0]?.count ?? 0);
  const commentRemaining = Number(commentRemainingRows[0]?.count ?? 0);

  return { postRemaining, commentRemaining };
}

async function findMissingLegacyColumns(
  prisma: Pick<GuestLegacyCleanupRehearsalPrisma, "$queryRawUnsafe">,
  table: LegacyTable,
  columns: readonly string[],
) {
  const rows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = ANY($2::text[])
  `,
    table,
    [...columns],
  );

  const existing = new Set(rows.map((row) => row.column_name));
  const missing = columns.filter((column) => !existing.has(column));
  return missing;
}

async function rehearsalDropInRollbackTransaction(prisma: GuestLegacyCleanupRehearsalPrisma) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('ALTER TABLE "Post" DROP COLUMN "guestDisplayName"');
    await tx.$executeRawUnsafe('ALTER TABLE "Post" DROP COLUMN "guestIpDisplay"');
    await tx.$executeRawUnsafe('ALTER TABLE "Post" DROP COLUMN "guestIpLabel"');
    await tx.$executeRawUnsafe('ALTER TABLE "Post" DROP COLUMN "guestPasswordHash"');
    await tx.$executeRawUnsafe('ALTER TABLE "Post" DROP COLUMN "guestIpHash"');
    await tx.$executeRawUnsafe('ALTER TABLE "Post" DROP COLUMN "guestFingerprintHash"');

    await tx.$executeRawUnsafe('ALTER TABLE "Comment" DROP COLUMN "guestDisplayName"');
    await tx.$executeRawUnsafe('ALTER TABLE "Comment" DROP COLUMN "guestIpDisplay"');
    await tx.$executeRawUnsafe('ALTER TABLE "Comment" DROP COLUMN "guestIpLabel"');
    await tx.$executeRawUnsafe('ALTER TABLE "Comment" DROP COLUMN "guestPasswordHash"');
    await tx.$executeRawUnsafe('ALTER TABLE "Comment" DROP COLUMN "guestIpHash"');
    await tx.$executeRawUnsafe('ALTER TABLE "Comment" DROP COLUMN "guestFingerprintHash"');

    throw new Error(EXPECTED_ROLLBACK_ERROR);
  });
}

export async function runGuestLegacyCleanupRehearsal(
  prisma: GuestLegacyCleanupRehearsalPrisma,
): Promise<RehearsalResult> {
  const pending = await countPendingBackfill(prisma);
  if (pending.postRemaining > 0 || pending.commentRemaining > 0) {
    return {
      ok: false,
      reason: "BACKFILL_INCOMPLETE",
      ...pending,
      shouldExitFailure: true,
    };
  }

  const [missingPostColumns, missingCommentColumns] = await Promise.all([
    findMissingLegacyColumns(prisma, "Post", LEGACY_COLUMNS),
    findMissingLegacyColumns(prisma, "Comment", LEGACY_COLUMNS),
  ]);

  if (missingPostColumns.length > 0 || missingCommentColumns.length > 0) {
    return {
      ok: true,
      rehearsal: "drop-legacy-guest-columns",
      rollback: true,
      skipped: "LEGACY_COLUMNS_ALREADY_DROPPED",
      shouldExitFailure: false,
    };
  }

  try {
    await rehearsalDropInRollbackTransaction(prisma);
    return {
      ok: false,
      reason: "REHEARSAL_DID_NOT_ROLLBACK",
      shouldExitFailure: true,
    };
  } catch (error) {
    if (!(error instanceof Error) || error.message !== EXPECTED_ROLLBACK_ERROR) {
      throw error;
    }
  }

  return {
    ok: true,
    rehearsal: "drop-legacy-guest-columns",
    rollback: true,
    shouldExitFailure: false,
  };
}

async function main(prisma: GuestLegacyCleanupRehearsalPrisma = new PrismaClient()) {
  const result = await runGuestLegacyCleanupRehearsal(prisma);
  const { shouldExitFailure, ...payload } = result;
  const serialized = JSON.stringify(payload);
  if (shouldExitFailure) {
    console.error(serialized);
    process.exit(1);
  }
  console.log(serialized);
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("rehearse-guest-legacy-cleanup.ts")
) {
  const prisma = new PrismaClient();
  main(prisma)
    .catch((error) => {
      console.error("Guest legacy cleanup rehearsal failed", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
