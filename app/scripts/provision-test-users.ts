import "dotenv/config";

import { Prisma, PrismaClient, UserRole } from "@prisma/client";
import { chmod, writeFile } from "fs/promises";

import {
  generateProvisionTestUserCredentials,
  resolveProvisionTestUsersConfig,
  type GeneratedTestUserCredential,
} from "../src/server/test-user-provisioning";
import { hashPassword } from "../src/server/password";

const prisma = new PrismaClient();
const MAX_CREATE_ATTEMPTS_PER_USER = 20;

type ProvisionedUserCredential = GeneratedTestUserCredential & {
  id: string;
  createdAt: string;
};

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function writeCredentialFile(
  outputFile: string,
  credentials: ProvisionedUserCredential[],
) {
  const payload = JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      count: credentials.length,
      users: credentials,
    },
    null,
    2,
  );
  await writeFile(outputFile, payload, { mode: 0o600 });
  await chmod(outputFile, 0o600);
}

async function createProvisionedUser(params: {
  emailDomain: string;
  existingEmails: Set<string>;
  existingNicknames: Set<string>;
}) {
  for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS_PER_USER; attempt += 1) {
    const [credential] = generateProvisionTestUserCredentials({
      count: 1,
      emailDomain: params.emailDomain,
      existingEmails: params.existingEmails,
      existingNicknames: params.existingNicknames,
    });

    if (!credential) {
      throw new Error("Failed to generate a test-user credential.");
    }

    const passwordHash = await hashPassword(credential.password);

    try {
      const createdUser = await prisma.user.create({
        data: {
          email: credential.email,
          nickname: credential.nickname,
          passwordHash,
          emailVerified: new Date(),
          role: UserRole.USER,
          bio: null,
          image: null,
          nicknameUpdatedAt: null,
          showPublicPosts: false,
          showPublicComments: false,
          showPublicPets: false,
        },
        select: {
          id: true,
          email: true,
          nickname: true,
          createdAt: true,
        },
      });

      params.existingEmails.add(createdUser.email);
      if (createdUser.nickname) {
        params.existingNicknames.add(createdUser.nickname);
      }

      return {
        id: createdUser.id,
        email: createdUser.email,
        nickname: createdUser.nickname ?? credential.nickname,
        password: credential.password,
        createdAt: createdUser.createdAt.toISOString(),
      } satisfies ProvisionedUserCredential;
    } catch (error) {
      if (isUniqueConstraintError(error) && attempt < MAX_CREATE_ATTEMPTS_PER_USER) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Unable to create a unique test user after repeated attempts.");
}

async function main() {
  const config = resolveProvisionTestUsersConfig(process.env);
  const existingUsers = await prisma.user.findMany({
    select: {
      email: true,
      nickname: true,
    },
  });

  const existingEmails = new Set(existingUsers.map((user) => user.email));
  const existingNicknames = new Set(
    existingUsers
      .map((user) => user.nickname)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
  );

  const credentials: ProvisionedUserCredential[] = [];
  for (let index = 0; index < config.count; index += 1) {
    const created = await createProvisionedUser({
      emailDomain: config.emailDomain,
      existingEmails,
      existingNicknames,
    });
    credentials.push(created);
  }

  if (config.outputFile) {
    await writeCredentialFile(config.outputFile, credentials);
  }

  console.log("Provisioned production-safe test users");
  console.log(`- count: ${credentials.length}`);
  console.log(`- domain: ${config.emailDomain}`);
  console.log(`- outputFile: ${config.outputFile ?? "(stdout only)"}`);
  console.log(
    "- note: store these credentials in a password manager and rotate/delete them when no longer needed.",
  );
  for (const credential of credentials) {
    console.log(
      `- ${credential.email} | nickname=${credential.nickname} | password=${credential.password}`,
    );
  }
}

main()
  .catch((error) => {
    console.error("Test-user provisioning failed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
