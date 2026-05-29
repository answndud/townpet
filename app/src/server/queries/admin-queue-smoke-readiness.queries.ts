type AdminQueueSmokeReadinessEnv = Record<string, string | undefined>;

const REQUIRED_ADMIN_QUEUE_SMOKE_KEYS = [
  "ADMIN_QUEUE_SMOKE_EMAIL",
  "ADMIN_QUEUE_SMOKE_PASSWORD",
] as const;

export type AdminQueueSmokeReadiness = {
  status: "PASS" | "BLOCKED";
  requiredKeys: string[];
  missingKeys: string[];
  configuredKeys: string[];
  command: string;
  docsPath: string;
};

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

export function getAdminQueueSmokeReadiness(
  env: AdminQueueSmokeReadinessEnv = process.env,
): AdminQueueSmokeReadiness {
  const requiredKeys = [...REQUIRED_ADMIN_QUEUE_SMOKE_KEYS];
  const missingKeys = requiredKeys.filter((key) => !hasValue(env[key]));
  const configuredKeys = requiredKeys.filter((key) => hasValue(env[key]));

  return {
    status: missingKeys.length > 0 ? "BLOCKED" : "PASS",
    requiredKeys,
    missingKeys,
    configuredKeys,
    command:
      "OPS_BASE_URL=https://townpet.vercel.app COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app ops:check:admin-queue-smoke",
    docsPath: "business/operations/배포전_on-demand_체크.md#7-관리자-queue-smoke",
  };
}
