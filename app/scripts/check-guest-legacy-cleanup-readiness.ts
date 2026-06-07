import "dotenv/config";
import { PrismaClient } from "@prisma/client";

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
type GuestLegacyPrisma = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $disconnect(): Promise<void>;
};
type GuestLegacyCleanupEnv = Record<string, string | undefined>;

type GuestLegacyCleanupConfig = {
  strict: boolean;
  lookbackHours: number;
};

type GuestLegacyCleanupReadinessPayload = {
  ok: boolean;
  strict: boolean;
  lookbackHours: number;
  postLegacyOnly: number;
  commentLegacyOnly: number;
  recentPostLegacyCredentialWrites: number;
  recentCommentLegacyCredentialWrites: number;
  pendingBackfillPosts: number;
  pendingBackfillComments: number;
  legacyColumnsPresent: boolean;
  postLegacyColumns: GuestLegacyColumn[];
  commentLegacyColumns: GuestLegacyColumn[];
  skipped?: "LEGACY_COLUMNS_ALREADY_DROPPED";
};

type GuestLegacyCleanupReadinessResult = {
  payload: GuestLegacyCleanupReadinessPayload;
  shouldExitFailure: boolean;
  warning?: "READINESS_NOT_FULLY_GREEN";
};

type GuestLegacyCleanupReadinessCliResult = {
  result: GuestLegacyCleanupReadinessResult;
  output: string;
  stream: "stdout" | "stderr";
  exitCode: 0 | 1;
};

export function normalizeGuestLegacyLookbackHours(value: string | undefined) {
  const raw = Number(value ?? "24");
  if (!Number.isFinite(raw) || raw <= 0) {
    return 24;
  }
  return Math.min(Math.floor(raw), 24 * 30);
}

export function resolveGuestLegacyCleanupConfig(
  env: GuestLegacyCleanupEnv,
): GuestLegacyCleanupConfig {
  return {
    strict: env.GUEST_LEGACY_CLEANUP_STRICT === "1",
    lookbackHours: normalizeGuestLegacyLookbackHours(env.GUEST_LEGACY_LOOKBACK_HOURS),
  };
}

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

export async function runGuestLegacyCleanupReadiness(
  prisma: GuestLegacyPrisma,
  config: GuestLegacyCleanupConfig,
): Promise<GuestLegacyCleanupReadinessResult> {
  const lookbackSince = new Date(Date.now() - config.lookbackHours * 60 * 60 * 1000).toISOString();

  const [postLegacyColumns, commentLegacyColumns] = await Promise.all([
    listExistingLegacyColumns(prisma, "Post"),
    listExistingLegacyColumns(prisma, "Comment"),
  ]);
  const hasPostLegacy = hasAnyGuestLegacyColumn(postLegacyColumns);
  const hasCommentLegacy = hasAnyGuestLegacyColumn(commentLegacyColumns);

  if (!hasPostLegacy && !hasCommentLegacy) {
    const payload = {
      ok: true,
      strict: config.strict,
      lookbackHours: config.lookbackHours,
      postLegacyOnly: 0,
      commentLegacyOnly: 0,
      recentPostLegacyCredentialWrites: 0,
      recentCommentLegacyCredentialWrites: 0,
      pendingBackfillPosts: 0,
      pendingBackfillComments: 0,
      legacyColumnsPresent: false,
      postLegacyColumns,
      commentLegacyColumns,
      skipped: "LEGACY_COLUMNS_ALREADY_DROPPED" as const,
    };
    return {
      payload,
      shouldExitFailure: false,
    };
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
    strict: config.strict,
    lookbackHours: config.lookbackHours,
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

  if (!ok && config.strict) {
    return {
      payload,
      shouldExitFailure: true,
    };
  }

  return {
    payload,
    shouldExitFailure: false,
    warning: ok ? undefined : "READINESS_NOT_FULLY_GREEN",
  };
}

export function formatGuestLegacyCleanupReadinessOutput(result: GuestLegacyCleanupReadinessResult) {
  const output = result.warning ? { ...result.payload, warning: result.warning } : result.payload;
  return JSON.stringify(output);
}

export async function runGuestLegacyCleanupReadinessCli(
  prisma: GuestLegacyPrisma,
  config: GuestLegacyCleanupConfig = resolveGuestLegacyCleanupConfig(process.env),
): Promise<GuestLegacyCleanupReadinessCliResult> {
  const result = await runGuestLegacyCleanupReadiness(prisma, config);
  return {
    result,
    output: formatGuestLegacyCleanupReadinessOutput(result),
    stream: result.shouldExitFailure ? "stderr" : result.payload.ok ? "stdout" : "stderr",
    exitCode: result.shouldExitFailure ? 1 : 0,
  };
}

export async function main(
  prisma: GuestLegacyPrisma = new PrismaClient(),
  config: GuestLegacyCleanupConfig = resolveGuestLegacyCleanupConfig(process.env),
) {
  const cliResult = await runGuestLegacyCleanupReadinessCli(prisma, config);
  const writer = cliResult.stream === "stdout" ? console.log : console.error;
  writer(cliResult.output);

  if (cliResult.exitCode !== 0) {
    process.exit(cliResult.exitCode);
  }

  return cliResult.output;
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("check-guest-legacy-cleanup-readiness.ts")
) {
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
