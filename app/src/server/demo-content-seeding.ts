import { assertDatabaseAccess } from "@/server/local-database-guard";

const EMAIL_DOMAIN_REGEX =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export const PRODUCTION_DEMO_CONTENT_CONFIRM_ENV_KEY = "PRODUCTION_DEMO_CONTENT_CONFIRM";
export const PRODUCTION_DEMO_CONTENT_CONFIRM_VALUE = "PRODUCTION_DEMO_CONTENT";

export type DemoContentSeedMode = "seed" | "cleanup";

export type DemoContentSeedConfig = {
  databaseUrl: string;
  emailDomain: string;
  mode: DemoContentSeedMode;
  resetExisting: boolean;
  includeLostFound: boolean;
};

function parseBooleanFlag(value: string | undefined, defaultValue: boolean) {
  if (typeof value !== "string") {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`Unsupported boolean flag value: ${value}`);
}

export function resolveDemoContentSeedConfig(
  env: NodeJS.ProcessEnv = process.env,
): DemoContentSeedConfig {
  const databaseUrl = assertDatabaseAccess({
    env,
    confirmEnvKey: PRODUCTION_DEMO_CONTENT_CONFIRM_ENV_KEY,
    confirmValue: PRODUCTION_DEMO_CONTENT_CONFIRM_VALUE,
    operationLabel: "production demo content seeding",
  });

  const emailDomain = env.DEMO_CONTENT_EMAIL_DOMAIN?.trim().toLowerCase();
  if (!emailDomain || !EMAIL_DOMAIN_REGEX.test(emailDomain)) {
    throw new Error(
      "DEMO_CONTENT_EMAIL_DOMAIN must be a valid owned domain like demo.example.com.",
    );
  }

  const normalizedMode = env.DEMO_CONTENT_MODE?.trim().toLowerCase() ?? "seed";
  if (normalizedMode !== "seed" && normalizedMode !== "cleanup") {
    throw new Error("DEMO_CONTENT_MODE must be either seed or cleanup.");
  }

  return {
    databaseUrl,
    emailDomain,
    mode: normalizedMode,
    resetExisting: parseBooleanFlag(env.DEMO_CONTENT_RESET_EXISTING, true),
    includeLostFound: parseBooleanFlag(env.DEMO_CONTENT_INCLUDE_LOST_FOUND, false),
  };
}

export function buildDemoAccountEmail(localPart: string, emailDomain: string) {
  const normalizedLocalPart = localPart.trim().toLowerCase();
  if (!normalizedLocalPart || !/^[a-z0-9.-]+$/.test(normalizedLocalPart)) {
    throw new Error(`Invalid demo account local-part: ${localPart}`);
  }

  return `${normalizedLocalPart}@${emailDomain}`;
}
