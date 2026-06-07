import "dotenv/config";

import { PrismaClient, UserRole } from "@prisma/client";

import { normalizeAuthEmail } from "../src/lib/auth-email";
import {
  hashLoginIdentifierEmail,
  maskLoginIdentifierEmail,
} from "../src/server/auth-login-identifier";
import { assertDatabaseAccess } from "../src/server/local-database-guard";
import { hashPassword } from "../src/server/password";

export const ADMIN_QUEUE_SMOKE_PROVISION_CONFIRM_VALUE = "PRODUCTION";
const ADMIN_QUEUE_SMOKE_PROVISION_CONFIRM_KEY = "ADMIN_QUEUE_SMOKE_PROVISION_CONFIRM";
const ADMIN_QUEUE_SMOKE_EMAIL_DOMAIN = "townpet.dev";

type AdminQueueSmokeProvisionEnv = NodeJS.ProcessEnv;

type AdminQueueSmokeProvisionConfig = {
  databaseUrl: string;
  email: string;
  password: string;
  nickname: string;
};

type AdminQueueSmokeProvisionPrisma = {
  user: {
    findUnique: (args: {
      where: { email: string };
      select: { id: true; email: true; nickname: true };
    }) => Promise<{ id: string; email: string; nickname: string | null } | null>;
    upsert: (args: {
      where: { email: string };
      update: {
        role: UserRole;
        passwordHash: string;
        emailVerified: Date;
        sessionVersion?: { increment: 1 };
      };
      create: {
        email: string;
        nickname: string;
        role: UserRole;
        passwordHash: string;
        emailVerified: Date;
      };
      select: { id: true; email: true; role: true; emailVerified: true };
    }) => Promise<{ id: string; email: string; role: UserRole; emailVerified: Date | null }>;
  };
};

function requireEnvValue(env: AdminQueueSmokeProvisionEnv, key: string) {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required.`);
  }
  return value;
}

function normalizeSmokeNickname(email: string) {
  const [localPart = "admin-queue-smoke"] = email.split("@");
  const normalized = localPart
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return normalized || "admin-queue-smoke";
}

function assertSmokeAdminEmail(email: string) {
  const [localPart = "", domain = ""] = email.split("@");
  if (domain !== ADMIN_QUEUE_SMOKE_EMAIL_DOMAIN) {
    throw new Error(`ADMIN_QUEUE_SMOKE_EMAIL must use @${ADMIN_QUEUE_SMOKE_EMAIL_DOMAIN}.`);
  }

  if (!localPart.includes("smoke")) {
    throw new Error("ADMIN_QUEUE_SMOKE_EMAIL local-part must include smoke.");
  }
}

export function resolveAdminQueueSmokeProvisionConfig(
  env: AdminQueueSmokeProvisionEnv,
): AdminQueueSmokeProvisionConfig {
  const databaseUrl = assertDatabaseAccess({
    env,
    confirmEnvKey: ADMIN_QUEUE_SMOKE_PROVISION_CONFIRM_KEY,
    confirmValue: ADMIN_QUEUE_SMOKE_PROVISION_CONFIRM_VALUE,
    operationLabel: "admin queue smoke credential provisioning",
  });
  const email = normalizeAuthEmail(requireEnvValue(env, "ADMIN_QUEUE_SMOKE_EMAIL"));
  const password = requireEnvValue(env, "ADMIN_QUEUE_SMOKE_PASSWORD");
  if (password.length < 12) {
    throw new Error("ADMIN_QUEUE_SMOKE_PASSWORD must be at least 12 characters.");
  }
  assertSmokeAdminEmail(email);

  return {
    databaseUrl,
    email,
    password,
    nickname: normalizeSmokeNickname(email),
  };
}

export async function provisionAdminQueueSmokeUser(
  prisma: AdminQueueSmokeProvisionPrisma,
  config: AdminQueueSmokeProvisionConfig,
) {
  const existing = await prisma.user.findUnique({
    where: { email: config.email },
    select: { id: true, email: true, nickname: true },
  });
  const passwordHash = await hashPassword(config.password);

  const user = await prisma.user.upsert({
    where: { email: config.email },
    update: {
      role: UserRole.ADMIN,
      passwordHash,
      emailVerified: new Date(),
      ...(existing ? { sessionVersion: { increment: 1 } as const } : {}),
    },
    create: {
      email: config.email,
      nickname: config.nickname,
      role: UserRole.ADMIN,
      passwordHash,
      emailVerified: new Date(),
    },
    select: {
      id: true,
      email: true,
      role: true,
      emailVerified: true,
    },
  });

  return {
    action: existing ? "updated" : "created",
    identifierHash: hashLoginIdentifierEmail(user.email),
    identifierLabel: maskLoginIdentifierEmail(user.email),
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
  } as const;
}

export async function main(env: AdminQueueSmokeProvisionEnv = process.env) {
  const config = resolveAdminQueueSmokeProvisionConfig(env);
  const client = new PrismaClient();

  try {
    const result = await provisionAdminQueueSmokeUser(client, config);
    console.log("Admin queue smoke user provisioned");
    console.log(`- action: ${result.action}`);
    console.log(`- identifierLabel: ${result.identifierLabel ?? "(unknown)"}`);
    console.log(`- identifierHash: ${result.identifierHash}`);
    console.log(`- role: ${result.role}`);
    console.log(`- emailVerified: ${result.emailVerified}`);
  } finally {
    await client.$disconnect();
  }
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("provision-admin-queue-smoke-user.ts")
) {
  main().catch((error) => {
    console.error("Admin queue smoke user provisioning failed");
    console.error(error);
    process.exit(1);
  });
}
