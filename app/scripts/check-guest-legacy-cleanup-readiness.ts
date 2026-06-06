import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const STRICT = process.env.GUEST_LEGACY_CLEANUP_STRICT === "1";
const GUEST_LEGACY_COLUMNS = [
  "guestDisplayName",
  "guestIpDisplay",
  "guestIpLabel",
  "guestPasswordHash",
  "guestIpHash",
  "guestFingerprintHash",
] as const;
const GUEST_LEGACY_CREDENTIAL_COLUMNS = ["guestPasswordHash", "guestIpHash"] as const;

type GuestLegacyColumn = (typeof GUEST_LEGACY_COLUMNS)[number];
type GuestLegacyCredentialColumn = (typeof GUEST_LEGACY_CREDENTIAL_COLUMNS)[number];
type LegacyTable = "Post" | "Comment";
type GuestLegacyPrisma = Pick<PrismaClient, "$queryRawUnsafe" | "$disconnect">;

export function normalizeGuestLegacyLookbackHours(value: string | undefined) {
  const raw = Number(value ?? "24");
  if (!Number.isFinite(raw) || raw <= 0) {
    return 24;
  }
  return Math.min(Math.floor(raw), 24 * 30);
}

const LOOKBACK_HOURS = normalizeGuestLegacyLookbackHours(process.env.GUEST_LEGACY_LOOKBACK_HOURS);

export function selectKnownGuestLegacyColumns(columns: string[]) {
  const known = new Set<string>(GUEST_LEGACY_COLUMNS);
  return columns.filter((column): column is GuestLegacyColumn => known.has(column));
}

export function hasAnyGuestLegacyColumn(columns: string[]) {
  return selectKnownGuestLegacyColumns(columns).length > 0;
}

function quoteColumn(column: GuestLegacyColumn | GuestLegacyCredentialColumn) {
  return `"${column}"`;
}

function buildAnyNotNullExpression(columns: readonly GuestLegacyColumn[]) {
  return columns.map((column) => `${quoteColumn(column)} IS NOT NULL`).join(" OR ");
}

async function listExistingLegacyColumns(prisma: GuestLegacyPrisma, table: LegacyTable) {
  const rows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = ANY($2::text[])
    `,
    table,
    [...GUEST_LEGACY_COLUMNS],
  );

  return selectKnownGuestLegacyColumns(rows.map((row) => row.column_name));
}

async function countLegacyOnly(
  prisma: GuestLegacyPrisma,
  table: LegacyTable,
  existingColumns: readonly GuestLegacyColumn[],
) {
  if (existingColumns.length === 0) {
    return 0;
  }

  const sql = `
    SELECT COUNT(*)::int AS count
    FROM "${table}"
    WHERE "guestAuthorId" IS NULL
      AND (${buildAnyNotNullExpression(existingColumns)})
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(sql);
  return Number(rows[0]?.count ?? 0);
}

async function countRecentLegacyCredentialWrites(
  prisma: GuestLegacyPrisma,
  table: LegacyTable,
  sinceIso: string,
  existingColumns: readonly GuestLegacyColumn[],
) {
  const credentialColumns = existingColumns.filter((column): column is GuestLegacyCredentialColumn =>
    GUEST_LEGACY_CREDENTIAL_COLUMNS.includes(column as GuestLegacyCredentialColumn),
  );
  if (credentialColumns.length === 0) {
    return 0;
  }

  const sql = `
    SELECT COUNT(*)::int AS count
    FROM "${table}"
    WHERE "createdAt" >= $1::timestamptz
      AND "guestAuthorId" IS NULL
      AND (${credentialColumns.map((column) => `${quoteColumn(column)} IS NOT NULL`).join(" OR ")})
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(sql, sinceIso);
  return Number(rows[0]?.count ?? 0);
}

async function countPendingBackfill(
  prisma: GuestLegacyPrisma,
  table: LegacyTable,
  existingColumns: readonly GuestLegacyColumn[],
) {
  if (!existingColumns.includes("guestPasswordHash")) {
    return 0;
  }

  const sql = `
    SELECT COUNT(*)::int AS count
    FROM "${table}"
    WHERE "guestAuthorId" IS NULL
      AND "guestPasswordHash" IS NOT NULL
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(sql);
  return Number(rows[0]?.count ?? 0);
}

async function main(prisma: GuestLegacyPrisma = new PrismaClient()) {
  const lookbackSince = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

  const [postLegacyColumns, commentLegacyColumns] = await Promise.all([
    listExistingLegacyColumns(prisma, "Post"),
    listExistingLegacyColumns(prisma, "Comment"),
  ]);
  const hasPostLegacy = hasAnyGuestLegacyColumn(postLegacyColumns);
  const hasCommentLegacy = hasAnyGuestLegacyColumn(commentLegacyColumns);

  if (!hasPostLegacy && !hasCommentLegacy) {
    const payload = {
      ok: true,
      strict: STRICT,
      lookbackHours: LOOKBACK_HOURS,
      postLegacyOnly: 0,
      commentLegacyOnly: 0,
      recentPostLegacyCredentialWrites: 0,
      recentCommentLegacyCredentialWrites: 0,
      pendingBackfillPosts: 0,
      pendingBackfillComments: 0,
      legacyColumnsPresent: false,
      postLegacyColumns,
      commentLegacyColumns,
      skipped: "LEGACY_COLUMNS_ALREADY_DROPPED",
    };
    console.log(JSON.stringify(payload));
    return;
  }

  const [
    postLegacyOnly,
    commentLegacyOnly,
    recentPostLegacyCredentialWrites,
    recentCommentLegacyCredentialWrites,
    pendingBackfillPosts,
    pendingBackfillComments,
  ] = await Promise.all([
    countLegacyOnly(prisma, "Post", postLegacyColumns),
    countLegacyOnly(prisma, "Comment", commentLegacyColumns),
    countRecentLegacyCredentialWrites(prisma, "Post", lookbackSince, postLegacyColumns),
    countRecentLegacyCredentialWrites(prisma, "Comment", lookbackSince, commentLegacyColumns),
    countPendingBackfill(prisma, "Post", postLegacyColumns),
    countPendingBackfill(prisma, "Comment", commentLegacyColumns),
  ]);

  const ok =
    postLegacyOnly === 0 &&
    commentLegacyOnly === 0 &&
    recentPostLegacyCredentialWrites === 0 &&
    recentCommentLegacyCredentialWrites === 0 &&
    pendingBackfillPosts === 0 &&
    pendingBackfillComments === 0;

  const payload = {
    ok,
    strict: STRICT,
    lookbackHours: LOOKBACK_HOURS,
    postLegacyOnly,
    commentLegacyOnly,
    recentPostLegacyCredentialWrites,
    recentCommentLegacyCredentialWrites,
    pendingBackfillPosts,
    pendingBackfillComments,
    legacyColumnsPresent: true,
    postLegacyColumns,
    commentLegacyColumns,
  };

  if (!ok && STRICT) {
    console.error(JSON.stringify(payload));
    process.exit(1);
  }

  const output = ok ? payload : { ...payload, warning: "READINESS_NOT_FULLY_GREEN" };
  if (ok) {
    console.log(JSON.stringify(output));
  } else {
    console.warn(JSON.stringify(output));
  }
}

if (require.main === module) {
  const prisma = new PrismaClient();
  main(prisma)
    .catch((error) => {
      console.error("Guest legacy cleanup readiness check failed", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
