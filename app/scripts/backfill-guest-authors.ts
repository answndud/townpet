import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";

import { isDryRunMode, resolveMaintenanceRunMode } from "./maintenance-run-mode";

export function resolveGuestAuthorBackfillBatchSize(
  rawValue = process.env.GUEST_AUTHOR_BACKFILL_BATCH_SIZE,
) {
  const raw = Number(rawValue ?? "200");
  if (!Number.isFinite(raw) || raw <= 0) {
    return 200;
  }

  return Math.min(Math.floor(raw), 1000);
}

type GuestMetaRecord = {
  id: string;
  guestDisplayName: string | null;
  guestPasswordHash: string | null;
  guestIpHash: string | null;
  guestFingerprintHash: string | null;
  guestIpDisplay: string | null;
  guestIpLabel: string | null;
};

type GuestAuthorBackfillPrisma = Pick<
  PrismaClient,
  "$disconnect" | "$queryRaw" | "$queryRawUnsafe" | "$transaction"
>;

type GuestAuthorBackfillConfig = {
  batchSize: number;
  dryRun: boolean;
};

type GuestAuthorBackfillResult = {
  batchSize: number;
  dryRun: boolean;
  hasLegacyPostColumns: boolean;
  hasLegacyCommentColumns: boolean;
  posts: number;
  comments: number;
};

async function tableHasColumn(
  prisma: GuestAuthorBackfillPrisma,
  table: "Post" | "Comment",
  column: string,
) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

export function toGuestAuthorData(record: GuestMetaRecord) {
  if (!record.guestPasswordHash || !record.guestIpHash) {
    return null;
  }

  return {
    displayName: record.guestDisplayName?.trim() || "익명",
    passwordHash: record.guestPasswordHash,
    ipHash: record.guestIpHash,
    fingerprintHash: record.guestFingerprintHash,
    ipDisplay: record.guestIpDisplay,
    ipLabel: record.guestIpLabel,
  };
}

async function fetchLegacyBatch(
  prisma: GuestAuthorBackfillPrisma,
  table: "Post" | "Comment",
  cursor: string | null,
  batchSize: number,
) {
  const sql = `
    SELECT
      id,
      "guestDisplayName",
      "guestPasswordHash",
      "guestIpHash",
      "guestFingerprintHash",
      "guestIpDisplay",
      "guestIpLabel"
    FROM "${table}"
    WHERE "guestAuthorId" IS NULL
      AND "guestPasswordHash" IS NOT NULL
      AND "guestIpHash" IS NOT NULL
      ${cursor ? `AND id > $1` : ""}
    ORDER BY id ASC
    LIMIT ${batchSize}
  `;

  const params = cursor ? [cursor] : [];
  return prisma.$queryRawUnsafe<GuestMetaRecord[]>(sql, ...params);
}

async function backfillPosts(
  prisma: GuestAuthorBackfillPrisma,
  config: GuestAuthorBackfillConfig,
) {
  let cursor: string | null = null;
  let updated = 0;

  while (true) {
    const items = await fetchLegacyBatch(prisma, "Post", cursor, config.batchSize);
    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      const guestAuthorData = toGuestAuthorData(item);
      if (!guestAuthorData) {
        continue;
      }

      if (config.dryRun) {
        updated += 1;
        continue;
      }

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const guestAuthor = await tx.guestAuthor.create({ data: guestAuthorData, select: { id: true } });
        await tx.post.update({ where: { id: item.id }, data: { guestAuthorId: guestAuthor.id } });
      });
      updated += 1;
    }

    cursor = items[items.length - 1]?.id ?? null;
  }

  return updated;
}

async function backfillComments(
  prisma: GuestAuthorBackfillPrisma,
  config: GuestAuthorBackfillConfig,
) {
  let cursor: string | null = null;
  let updated = 0;

  while (true) {
    const items = await fetchLegacyBatch(prisma, "Comment", cursor, config.batchSize);
    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      const guestAuthorData = toGuestAuthorData(item);
      if (!guestAuthorData) {
        continue;
      }

      if (config.dryRun) {
        updated += 1;
        continue;
      }

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const guestAuthor = await tx.guestAuthor.create({ data: guestAuthorData, select: { id: true } });
        await tx.comment.update({ where: { id: item.id }, data: { guestAuthorId: guestAuthor.id } });
      });
      updated += 1;
    }

    cursor = items[items.length - 1]?.id ?? null;
  }

  return updated;
}

export function formatGuestAuthorBackfillOutput(result: GuestAuthorBackfillResult) {
  const lines = [
    `Guest author backfill started (dryRun=${result.dryRun ? "yes" : "no"}, batchSize=${result.batchSize})`,
  ];

  if (!result.hasLegacyPostColumns && !result.hasLegacyCommentColumns) {
    lines.push("Legacy guest columns already dropped. Backfill skipped.");
    return lines.join("\n");
  }

  if (result.dryRun) {
    lines.push(
      `Dry-run matched ${result.posts} posts and ${result.comments} comments for backfill.`,
    );
    lines.push("Re-run with --apply to write guestAuthorId backfill rows.");
    return lines.join("\n");
  }

  lines.push(
    `Backfilled guestAuthorId for ${result.posts} posts and ${result.comments} comments.`,
  );

  return lines.join("\n");
}

export async function runGuestAuthorBackfill(
  prisma: GuestAuthorBackfillPrisma,
  config: GuestAuthorBackfillConfig = {
    batchSize: resolveGuestAuthorBackfillBatchSize(),
    dryRun: isDryRunMode(
      resolveMaintenanceRunMode({
        dryRunEnvName: "GUEST_AUTHOR_BACKFILL_DRY_RUN",
        applyEnvName: "GUEST_AUTHOR_BACKFILL_APPLY",
      }),
    ),
  },
) {
  const hasLegacyPostColumns = await tableHasColumn(prisma, "Post", "guestPasswordHash");
  const hasLegacyCommentColumns = await tableHasColumn(
    prisma,
    "Comment",
    "guestPasswordHash",
  );

  if (!hasLegacyPostColumns && !hasLegacyCommentColumns) {
    return formatGuestAuthorBackfillOutput({
      ...config,
      hasLegacyPostColumns,
      hasLegacyCommentColumns,
      posts: 0,
      comments: 0,
    });
  }

  const posts = hasLegacyPostColumns ? await backfillPosts(prisma, config) : 0;
  const comments = hasLegacyCommentColumns ? await backfillComments(prisma, config) : 0;

  return formatGuestAuthorBackfillOutput({
    ...config,
    hasLegacyPostColumns,
    hasLegacyCommentColumns,
    posts,
    comments,
  });
}

async function main(prisma: GuestAuthorBackfillPrisma = new PrismaClient()) {
  console.log(await runGuestAuthorBackfill(prisma));
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("backfill-guest-authors.ts")
) {
  const prisma = new PrismaClient();
  main(prisma)
    .catch((error) => {
      console.error("Guest author backfill failed", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
