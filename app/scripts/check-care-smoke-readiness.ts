import "dotenv/config";

export const CARE_SMOKE_DEFAULTS = {
  baseUrl: "https://townpet.vercel.app",
  adminEmail: "care.smoke.admin@townpet.dev",
  requesterEmail: "care.smoke.requester@townpet.dev",
  caregiverEmail: "care.smoke.caregiver@townpet.dev",
} as const;

type CareSmokeReadinessEnv = Record<string, string | undefined>;

type CareSmokeReadinessCliResult = {
  result: CareSmokeReadinessResult;
  output: string;
  exitCode: 0 | 1;
};

export type CareSmokeReadinessResult = {
  status: "PASS" | "BLOCKED";
  baseUrl: string;
  checks: Array<{
    key: string;
    status: "PASS" | "WARN" | "BLOCKED";
    detail: string;
  }>;
  smokeAccounts: {
    adminEmail: string;
    requesterEmail: string;
    caregiverEmail: string;
    usingDefaults: boolean;
  };
};

function read(env: CareSmokeReadinessEnv, key: string) {
  return env[key]?.trim() ?? "";
}

function hasAny(env: CareSmokeReadinessEnv, keys: string[]) {
  return keys.some((key) => Boolean(read(env, key)));
}

export function buildCareSmokeReadiness(env: CareSmokeReadinessEnv): CareSmokeReadinessResult {
  const baseUrl = read(env, "OPS_BASE_URL") || CARE_SMOKE_DEFAULTS.baseUrl;
  const adminEmail = read(env, "CARE_SMOKE_ADMIN_EMAIL") || CARE_SMOKE_DEFAULTS.adminEmail;
  const requesterEmail =
    read(env, "CARE_SMOKE_REQUESTER_EMAIL") || CARE_SMOKE_DEFAULTS.requesterEmail;
  const caregiverEmail =
    read(env, "CARE_SMOKE_CAREGIVER_EMAIL") || CARE_SMOKE_DEFAULTS.caregiverEmail;
  const usingDefaults =
    !read(env, "CARE_SMOKE_ADMIN_EMAIL") ||
    !read(env, "CARE_SMOKE_REQUESTER_EMAIL") ||
    !read(env, "CARE_SMOKE_CAREGIVER_EMAIL");
  const hasInternalHealthToken = hasAny(env, ["OPS_HEALTH_INTERNAL_TOKEN", "HEALTH_INTERNAL_TOKEN"]);
  const sentryKeys = ["SENTRY_DSN", "SENTRY_AUTH_TOKEN", "SENTRY_ORG_SLUG", "SENTRY_PROJECT_SLUG"];
  const hasAllSentryKeys = sentryKeys.every((key) => Boolean(read(env, key)));

  const checks: CareSmokeReadinessResult["checks"] = [
    {
      key: "OPS_BASE_URL",
      status: baseUrl ? "PASS" : "BLOCKED",
      detail: read(env, "OPS_BASE_URL") ? "설정됨" : `기본값 사용: ${CARE_SMOKE_DEFAULTS.baseUrl}`,
    },
    {
      key: "INTERNAL_HEALTH_TOKEN",
      status: hasInternalHealthToken ? "PASS" : "BLOCKED",
      detail: hasInternalHealthToken
        ? "설정됨"
        : "OPS_HEALTH_INTERNAL_TOKEN 또는 HEALTH_INTERNAL_TOKEN 필요",
    },
    {
      key: "CARE_SMOKE_ACCOUNTS",
      status: usingDefaults ? "WARN" : "PASS",
      detail: usingDefaults
        ? "표준 식별자 기본값 사용. 운영에 실제 계정과 권한이 있어야 smoke 가능"
        : "전용 계정 식별자 설정됨",
    },
    {
      key: "SENTRY_SMOKE",
      status: hasAllSentryKeys ? "PASS" : "WARN",
      detail: hasAllSentryKeys
        ? "선택 Sentry smoke 실행 가능"
        : "Sentry smoke는 선택 항목. 실행하려면 Sentry secret 4종 필요",
    },
  ];

  return {
    status: checks.some((check) => check.status === "BLOCKED") ? "BLOCKED" : "PASS",
    baseUrl,
    checks,
    smokeAccounts: {
      adminEmail,
      requesterEmail,
      caregiverEmail,
      usingDefaults,
    },
  };
}

export function formatCareSmokeReadiness(result: CareSmokeReadinessResult) {
  const lines = [
    "Care smoke readiness",
    `- status: ${result.status}`,
    `- baseUrl: ${result.baseUrl}`,
    "- checks:",
    ...result.checks.map((check) => `  - ${check.key}: ${check.status} (${check.detail})`),
    "- smoke account identifiers:",
    `  - admin: ${result.smokeAccounts.adminEmail}`,
    `  - requester: ${result.smokeAccounts.requesterEmail}`,
    `  - caregiver: ${result.smokeAccounts.caregiverEmail}`,
    `  - usingDefaults: ${String(result.smokeAccounts.usingDefaults)}`,
  ];

  return lines.join("\n");
}

export function runCareSmokeReadinessCli(
  env: CareSmokeReadinessEnv = process.env,
): CareSmokeReadinessCliResult {
  const result = buildCareSmokeReadiness(env);
  return {
    result,
    output: formatCareSmokeReadiness(result),
    exitCode: result.status === "PASS" ? 0 : 1,
  };
}

export function main(env: CareSmokeReadinessEnv = process.env) {
  const cliResult = runCareSmokeReadinessCli(env);
  console.log(cliResult.output);
  if (cliResult.exitCode !== 0) {
    process.exit(cliResult.exitCode);
  }

  return cliResult.output;
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("check-care-smoke-readiness.ts")
) {
  main();
}
