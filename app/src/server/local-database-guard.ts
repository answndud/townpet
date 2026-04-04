const LOCAL_DATABASE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "postgres",
  "host.docker.internal",
]);

export const NON_LOCAL_DATABASE_CONFIRM_VALUE = "NON_LOCAL_DB";
export const LOCAL_DB_SEED_CONFIRM_ENV_KEY = "LOCAL_DB_SEED_CONFIRM";

type AssertDatabaseAccessParams = {
  env?: NodeJS.ProcessEnv;
  databaseUrl?: string;
  confirmEnvKey: string;
  confirmValue: string;
  operationLabel: string;
};

function normalizeDatabaseHost(hostname: string) {
  return hostname.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
}

export function isLocalDatabaseUrl(databaseUrl: string) {
  const normalized = databaseUrl.trim();
  if (!normalized.startsWith("postgresql://") && !normalized.startsWith("postgres://")) {
    return false;
  }

  try {
    const parsed = new URL(normalized);
    return LOCAL_DATABASE_HOSTS.has(normalizeDatabaseHost(parsed.hostname));
  } catch {
    return /(localhost|127\.0\.0\.1|\[::1\]|@postgres(?::|\/|\?)|host\.docker\.internal)/i.test(
      normalized,
    );
  }
}

export function assertDatabaseAccess(params: AssertDatabaseAccessParams) {
  const env = params.env ?? process.env;
  const databaseUrl = params.databaseUrl?.trim() || env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    throw new Error("DATABASE_URL must start with postgresql:// or postgres://.");
  }

  if (!isLocalDatabaseUrl(databaseUrl) && env[params.confirmEnvKey] !== params.confirmValue) {
    throw new Error(
      `${params.confirmEnvKey}=${params.confirmValue} is required for ${params.operationLabel} against a non-local database.`,
    );
  }

  return databaseUrl;
}

export function assertLocalDevelopmentDatabase(
  env: NodeJS.ProcessEnv = process.env,
  operationLabel = "local development seed scripts",
) {
  return assertDatabaseAccess({
    env,
    confirmEnvKey: LOCAL_DB_SEED_CONFIRM_ENV_KEY,
    confirmValue: NON_LOCAL_DATABASE_CONFIRM_VALUE,
    operationLabel,
  });
}
