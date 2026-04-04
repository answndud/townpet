import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";

import { assertLocalDevelopmentDatabase } from "../src/server/local-database-guard";
import { hashPassword } from "../src/server/password";

const prisma = new PrismaClient();

const EXPECTED_TOTAL_USERS = 87;
const EXPECTED_WITH_PASSWORD = 70;
const EXPECTED_WITHOUT_PASSWORD = 17;

type SeedAccount = {
  email: string;
  nickname: string | null;
  role: UserRole;
  hasPassword: boolean;
  verified: boolean;
};

const fixedPasswordAccounts: SeedAccount[] = [
  {
    email: "e2e.profile.link@townpet.dev",
    nickname: "e2e-profile-link",
    role: UserRole.USER,
    hasPassword: true,
    verified: true,
  },
  {
    email: "e2e.profile.unlink@townpet.dev",
    nickname: "e2e-profile-unlink",
    role: UserRole.USER,
    hasPassword: true,
    verified: true,
  },
  {
    email: "e2e.search.author.global@townpet.dev",
    nickname: "e2e-search-global",
    role: UserRole.USER,
    hasPassword: true,
    verified: true,
  },
  {
    email: "e2e.search.author.local@townpet.dev",
    nickname: "e2e-search-local",
    role: UserRole.USER,
    hasPassword: true,
    verified: true,
  },
  {
    email: "e2e.search.author.hidden@townpet.dev",
    nickname: "e2e-search-hidden",
    role: UserRole.USER,
    hasPassword: true,
    verified: true,
  },
  {
    email: "e2e.search.author.visible@townpet.dev",
    nickname: "e2e-search-visible",
    role: UserRole.USER,
    hasPassword: true,
    verified: true,
  },
  {
    email: "e2e.search.adoption.visible@townpet.dev",
    nickname: "e2e-adoption-visible",
    role: UserRole.USER,
    hasPassword: true,
    verified: true,
  },
  {
    email: "e2e.search.adoption.blocked@townpet.dev",
    nickname: "e2e-adoption-blocked",
    role: UserRole.USER,
    hasPassword: true,
    verified: true,
  },
  {
    email: "e2e.global-first@townpet.dev",
    nickname: "e2e-global-first",
    role: UserRole.USER,
    hasPassword: true,
    verified: true,
  },
  {
    email: "e2e.upload@townpet.dev",
    nickname: "e2e-upload",
    role: UserRole.USER,
    hasPassword: true,
    verified: true,
  },
  {
    email: "perf.scroll@townpet.dev",
    nickname: "feed-perf-runner",
    role: UserRole.USER,
    hasPassword: true,
    verified: true,
  },
];

const fixedPasswordlessAccounts: SeedAccount[] = [
  {
    email: "e2e.kakao@townpet.dev",
    nickname: "e2e-social-kakao",
    role: UserRole.USER,
    hasPassword: false,
    verified: true,
  },
  {
    email: "e2e.naver@townpet.dev",
    nickname: "e2e-social-naver",
    role: UserRole.USER,
    hasPassword: false,
    verified: true,
  },
  {
    email: "guest.system@townpet.local",
    nickname: null,
    role: UserRole.USER,
    hasPassword: false,
    verified: false,
  },
];

function numberedAccounts(params: {
  prefix: string;
  count: number;
  nicknamePrefix: string;
  role?: UserRole;
}) {
  return Array.from({ length: params.count }, (_, index) => {
    const serial = String(index + 1).padStart(3, "0");
    return {
      email: `${params.prefix}${serial}@townpet.dev`,
      nickname: `${params.nicknamePrefix}-${serial}`,
      role: params.role ?? UserRole.USER,
      hasPassword: true,
      verified: true,
    } satisfies SeedAccount;
  });
}

const dynamicPasswordAccounts: SeedAccount[] = [
  ...numberedAccounts({
    prefix: "pw-auth-case-",
    count: 10,
    nicknamePrefix: "pw-auth-case",
  }),
  ...numberedAccounts({
    prefix: "pw-comment-auth-",
    count: 10,
    nicknamePrefix: "pw-comment-auth",
  }),
  ...numberedAccounts({
    prefix: "e2e.search.viewer.sample",
    count: 8,
    nicknamePrefix: "search-viewer",
  }),
  ...numberedAccounts({
    prefix: "pw-auth-suspended-",
    count: 5,
    nicknamePrefix: "pw-auth-suspended",
  }),
  ...numberedAccounts({
    prefix: "pw-auth-suspended-",
    count: 5,
    nicknamePrefix: "pw-auth-moderator",
    role: UserRole.ADMIN,
  }).map((account) => ({
    ...account,
    email: account.email.replace("@townpet.dev", "-moderator@townpet.dev"),
  })),
];

const supplementalAccounts = [
  ...fixedPasswordAccounts,
  ...fixedPasswordlessAccounts,
  ...dynamicPasswordAccounts,
];

async function main() {
  assertLocalDevelopmentDatabase(process.env, "local test account seeding");

  const seedPassword = process.env.SEED_DEFAULT_PASSWORD;
  if (!seedPassword) {
    throw new Error("SEED_DEFAULT_PASSWORD is required.");
  }

  const passwordHash = await hashPassword(seedPassword);

  for (const account of supplementalAccounts) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        nickname: account.nickname,
        nicknameUpdatedAt: null,
        bio: null,
        role: account.role,
        emailVerified: account.verified ? new Date() : null,
        passwordHash: account.hasPassword ? passwordHash : null,
      },
      create: {
        email: account.email,
        nickname: account.nickname,
        role: account.role,
        emailVerified: account.verified ? new Date() : null,
        passwordHash: account.hasPassword ? passwordHash : null,
      },
    });
  }

  const passwordlessAccounts = await prisma.user.findMany({
      where: {
        passwordHash: null,
      },
      orderBy: { email: "asc" },
      select: { email: true },
    });

  const totals = await prisma.$queryRaw<
    Array<{
      users: bigint;
      with_password: bigint;
      without_password: bigint;
    }>
  >`
    SELECT
      COUNT(*)::bigint AS users,
      COUNT(*) FILTER (WHERE "passwordHash" IS NOT NULL)::bigint AS with_password,
      COUNT(*) FILTER (WHERE "passwordHash" IS NULL)::bigint AS without_password
    FROM "User"
  `;

  const counts = totals[0];
  const users = Number(counts?.users ?? BigInt(0));
  const withPassword = Number(counts?.with_password ?? BigInt(0));
  const withoutPassword = Number(counts?.without_password ?? BigInt(0));

  console.log(
    JSON.stringify(
      {
        seededAccounts: supplementalAccounts.length,
        expected: {
          users: EXPECTED_TOTAL_USERS,
          withPassword: EXPECTED_WITH_PASSWORD,
          withoutPassword: EXPECTED_WITHOUT_PASSWORD,
        },
        actual: {
          users,
          withPassword,
          withoutPassword,
        },
        passwordlessEmails: passwordlessAccounts.map((account) => account.email),
      },
      null,
      2,
    ),
  );

  if (
    users !== EXPECTED_TOTAL_USERS ||
    withPassword !== EXPECTED_WITH_PASSWORD ||
    withoutPassword !== EXPECTED_WITHOUT_PASSWORD
  ) {
    throw new Error(
      `Local account seed mismatch: expected ${EXPECTED_TOTAL_USERS}/${EXPECTED_WITH_PASSWORD}/${EXPECTED_WITHOUT_PASSWORD}, got ${users}/${withPassword}/${withoutPassword}`,
    );
  }
}

main()
  .catch((error) => {
    console.error("Seed local test accounts failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
