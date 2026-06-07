import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { assertLocalDevelopmentDatabase } from "../src/server/local-database-guard";
import { hashPassword } from "../src/server/password";

let prisma: PrismaClient;

async function main() {
  assertLocalDevelopmentDatabase(process.env, "demo/admin account seeding");

  const email = process.env.DEMO_USER_EMAIL ?? "demo@townpet.dev";
  const seedPassword = process.env.SEED_DEFAULT_PASSWORD;
  if (!seedPassword) {
    throw new Error("SEED_DEFAULT_PASSWORD is required.");
  }
  const passwordHash = await hashPassword(seedPassword);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: UserRole.ADMIN,
      passwordHash,
      emailVerified: new Date(),
    },
    create: {
      email,
      nickname: "townpet-admin",
      role: UserRole.ADMIN,
      passwordHash,
      emailVerified: new Date(),
    },
  });

  console.log(`Admin user ready: ${user.email}`);
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("seed-admin.ts")
) {
  prisma = new PrismaClient();
  main()
    .catch((error) => {
      console.error("Seed admin failed", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
