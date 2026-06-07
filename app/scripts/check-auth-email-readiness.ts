import "dotenv/config";

import {
  assessAuthEmailReadiness,
  type AuthEmailNormalizationDrift,
  type AuthEmailReadinessReport,
  type AuthEmailReadinessStatus,
  type InvalidAuthEmailRecord,
} from "../src/server/auth-email-readiness";

type AuthEmailReadinessPrisma = {
  user: {
    findMany(args: {
      select: { id: true; email: true };
      orderBy: { id: "asc" };
    }): Promise<Array<{ id: string; email: string }>>;
  };
  verificationToken: {
    findMany(args: {
      select: { identifier: true; token: true };
      orderBy: { token: "asc" };
    }): Promise<Array<{ identifier: string; token: string }>>;
  };
  $disconnect(): Promise<void>;
};

export function resolveAuthEmailReadinessSampleLimit(
  raw = process.env.AUTH_EMAIL_PREFLIGHT_SAMPLE_LIMIT,
) {
  const parsed = Number(raw ?? 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 10;
  }

  return Math.floor(parsed);
}

function formatStatusLine(status: AuthEmailReadinessStatus, key: string, detail: string) {
  return `- [${status}] ${key}: ${detail}`;
}

function formatSampleRows(
  label: string,
  rows: Array<AuthEmailNormalizationDrift | InvalidAuthEmailRecord>,
  buildRowSummary: (row: AuthEmailNormalizationDrift | InvalidAuthEmailRecord) => string,
  sampleLimit: number,
) {
  if (rows.length === 0) {
    return [];
  }

  const lines = [`  ${label} (showing up to ${Math.min(rows.length, sampleLimit)}):`];
  for (const row of rows.slice(0, sampleLimit)) {
    lines.push(`  - ${buildRowSummary(row)}`);
  }

  return lines;
}

function formatDuplicateGroups(report: AuthEmailReadinessReport, sampleLimit: number) {
  if (report.duplicateEmailGroups.length === 0) {
    return [];
  }

  const lines = [
    `  duplicate groups (showing up to ${Math.min(report.duplicateEmailGroups.length, sampleLimit)}):`,
  ];
  for (const group of report.duplicateEmailGroups.slice(0, sampleLimit)) {
    const members = group.users
      .map((user) => `${user.id}:${JSON.stringify(user.email)}`)
      .join(", ");
    lines.push(`  - ${group.normalizedEmail} -> ${members}`);
  }

  return lines;
}

export function formatAuthEmailReadinessReport(
  report: AuthEmailReadinessReport,
  sampleLimit = resolveAuthEmailReadinessSampleLimit(),
) {
  const failCount =
    (report.duplicateEmailGroups.length > 0 ? 1 : 0) +
    (report.invalidUserEmails.length > 0 ? 1 : 0);
  const warnCount =
    (report.userEmailNormalizationDrift.length > 0 ? 1 : 0) +
    (report.verificationIdentifierNormalizationDrift.length > 0 ? 1 : 0) +
    (report.invalidVerificationIdentifiers.length > 0 ? 1 : 0);
  const passCount = 5 - failCount - warnCount;

  const lines = [
    "Auth email readiness preflight",
    `- users: ${report.totalUsers}`,
    `- verificationTokens: ${report.totalVerificationTokens}`,
  ];

  if (report.duplicateEmailGroups.length > 0) {
    lines.push(
      formatStatusLine(
        "FAIL",
        "USER_EMAIL_CASE_INSENSITIVE_DUPLICATES",
        `${report.duplicateEmailGroups.length}개 normalized email group이 충돌합니다.`,
      ),
    );
    lines.push(...formatDuplicateGroups(report, sampleLimit));
  } else {
    lines.push(formatStatusLine("PASS", "USER_EMAIL_CASE_INSENSITIVE_DUPLICATES", "충돌 없음"));
  }

  if (report.invalidUserEmails.length > 0) {
    lines.push(
      formatStatusLine(
        "FAIL",
        "USER_EMAIL_INVALID_ROWS",
        `${report.invalidUserEmails.length}개 user email이 정규화 후에도 유효한 이메일 형식이 아닙니다.`,
      ),
    );
    lines.push(
      ...formatSampleRows(
        "invalid user emails",
        report.invalidUserEmails,
        (row) => {
          const invalidRow = row as InvalidAuthEmailRecord & { id?: string };
          return `${invalidRow.id ?? "unknown"} current=${JSON.stringify(invalidRow.currentValue)} normalized=${JSON.stringify(invalidRow.normalizedValue)}`;
        },
        sampleLimit,
      ),
    );
  } else {
    lines.push(formatStatusLine("PASS", "USER_EMAIL_INVALID_ROWS", "유효하지 않은 user email 없음"));
  }

  if (report.userEmailNormalizationDrift.length > 0) {
    lines.push(
      formatStatusLine(
        "WARN",
        "USER_EMAIL_NORMALIZATION_DRIFT",
        `${report.userEmailNormalizationDrift.length}개 user email이 trim+lowercase로 재기록됩니다.`,
      ),
    );
    lines.push(
      ...formatSampleRows(
        "user email drift",
        report.userEmailNormalizationDrift,
        (row) => {
          const driftRow = row as AuthEmailNormalizationDrift & { id?: string };
          return `${driftRow.id ?? "unknown"} current=${JSON.stringify(driftRow.currentValue)} normalized=${JSON.stringify(driftRow.normalizedValue)}`;
        },
        sampleLimit,
      ),
    );
  } else {
    lines.push(formatStatusLine("PASS", "USER_EMAIL_NORMALIZATION_DRIFT", "재기록 대상 없음"));
  }

  if (report.verificationIdentifierNormalizationDrift.length > 0) {
    lines.push(
      formatStatusLine(
        "WARN",
        "VERIFICATION_IDENTIFIER_NORMALIZATION_DRIFT",
        `${report.verificationIdentifierNormalizationDrift.length}개 verification identifier가 trim+lowercase로 재기록됩니다.`,
      ),
    );
    lines.push(
      ...formatSampleRows(
        "verification identifier drift",
        report.verificationIdentifierNormalizationDrift,
        (row) => {
          const driftRow = row as AuthEmailNormalizationDrift & { token?: string };
          return `${driftRow.token ?? "unknown"} current=${JSON.stringify(driftRow.currentValue)} normalized=${JSON.stringify(driftRow.normalizedValue)}`;
        },
        sampleLimit,
      ),
    );
  } else {
    lines.push(
      formatStatusLine(
        "PASS",
        "VERIFICATION_IDENTIFIER_NORMALIZATION_DRIFT",
        "재기록 대상 없음",
      ),
    );
  }

  if (report.invalidVerificationIdentifiers.length > 0) {
    lines.push(
      formatStatusLine(
        "WARN",
        "VERIFICATION_IDENTIFIER_INVALID_ROWS",
        `${report.invalidVerificationIdentifiers.length}개 verification identifier가 정규화 후에도 유효한 이메일 형식이 아닙니다.`,
      ),
    );
    lines.push(
      ...formatSampleRows(
        "invalid verification identifiers",
        report.invalidVerificationIdentifiers,
        (row) => {
          const invalidRow = row as InvalidAuthEmailRecord & { token?: string };
          return `${invalidRow.token ?? "unknown"} current=${JSON.stringify(invalidRow.currentValue)} normalized=${JSON.stringify(invalidRow.normalizedValue)}`;
        },
        sampleLimit,
      ),
    );
  } else {
    lines.push(
      formatStatusLine(
        "PASS",
        "VERIFICATION_IDENTIFIER_INVALID_ROWS",
        "유효하지 않은 verification identifier 없음",
      ),
    );
  }

  lines.push(`- summary: pass=${passCount}, warn=${warnCount}, fail=${failCount}`);

  return lines.join("\n");
}

export async function runAuthEmailReadinessPreflight(
  prisma: AuthEmailReadinessPrisma,
  sampleLimit = resolveAuthEmailReadinessSampleLimit(),
) {
  const [users, verificationTokens] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
      },
      orderBy: {
        id: "asc",
      },
    }),
    prisma.verificationToken.findMany({
      select: {
        identifier: true,
        token: true,
      },
      orderBy: {
        token: "asc",
      },
    }),
  ]);

  const report = assessAuthEmailReadiness({
    users,
    verificationTokens,
  });

  return {
    report,
    output: formatAuthEmailReadinessReport(report, sampleLimit),
  };
}

async function main(prisma: AuthEmailReadinessPrisma) {
  const result = await runAuthEmailReadinessPreflight(prisma);

  console.log(result.output);

  if (result.report.status === "FAIL") {
    process.exit(1);
  }
}

async function runCli() {
  const { prisma } = await import("../src/lib/prisma");

  try {
    await main(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("check-auth-email-readiness.ts")
) {
  runCli().catch((error) => {
    console.error("Auth email readiness preflight failed");
    console.error(error);
    process.exit(1);
  });
}
