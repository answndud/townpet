import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import { assertDatabaseAccess } from "../src/server/local-database-guard";

const CONFIRM_ENV_KEY = "FOUNDING_MEMBER_GRANT_CONFIRM";
const CONFIRM_VALUE = "GRANT_FOUNDING_MEMBER";

type GrantOptions = {
  email?: string;
  userId?: string;
  revoke: boolean;
  dryRun: boolean;
};

function usage() {
  return [
    "Usage:",
    "  pnpm ops:founding-member:grant -- --email user@example.com",
    "  pnpm ops:founding-member:grant -- --user-id <user-id>",
    "  pnpm ops:founding-member:grant -- --email user@example.com --revoke",
    "",
    `For non-local DATABASE_URL, set ${CONFIRM_ENV_KEY}=${CONFIRM_VALUE}.`,
  ].join("\n");
}

export function parseGrantOptions(argv: string[]): GrantOptions {
  const options: GrantOptions = {
    revoke: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--email") {
      const value = argv[index + 1]?.trim();
      if (!value || value.startsWith("--")) {
        throw new Error("--email requires a value.\n\n" + usage());
      }
      options.email = value;
      index += 1;
      continue;
    }
    if (arg === "--user-id") {
      const value = argv[index + 1]?.trim();
      if (!value || value.startsWith("--")) {
        throw new Error("--user-id requires a value.\n\n" + usage());
      }
      options.userId = value;
      index += 1;
      continue;
    }
    if (arg === "--revoke") {
      options.revoke = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}\n\n${usage()}`);
  }

  if (Boolean(options.email) === Boolean(options.userId)) {
    throw new Error("Pass exactly one of --email or --user-id.\n\n" + usage());
  }

  return options;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(usage());
    return;
  }

  const options = parseGrantOptions(args);

  assertDatabaseAccess({
    confirmEnvKey: CONFIRM_ENV_KEY,
    confirmValue: CONFIRM_VALUE,
    operationLabel: "Founding Member badge grant",
  });

  const prisma = new PrismaClient();
  const where = options.email
    ? { email: options.email }
    : { id: options.userId as string };

  try {
    const user = await prisma.user.findUnique({
      where,
      select: {
        id: true,
        email: true,
        nickname: true,
        isFoundingMember: true,
        foundingMemberSince: true,
      },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    const nextData = options.revoke
      ? { isFoundingMember: false, foundingMemberSince: null }
      : {
          isFoundingMember: true,
          foundingMemberSince: user.foundingMemberSince ?? new Date(),
        };

    if (options.dryRun) {
      console.log(
        JSON.stringify(
          {
            dryRun: true,
            user,
            nextData,
          },
          null,
          2,
        ),
      );
      return;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: nextData,
      select: {
        id: true,
        email: true,
        nickname: true,
        isFoundingMember: true,
        foundingMemberSince: true,
      },
    });

    console.log(JSON.stringify(updated, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
