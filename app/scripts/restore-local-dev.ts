import "dotenv/config";
import { spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const repoRoot = resolve(appRoot, "..");
const prisma = new PrismaClient();

const LOCAL_SEED_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "townpet123";
const PG_READY_TIMEOUT_MS = 120_000;
const PG_READY_POLL_MS = 2_000;

function runCommand(
  command: string,
  args: string[],
  options?: {
    cwd?: string;
    env?: Record<string, string | undefined>;
    quiet?: boolean;
  },
) {
  const result = spawnSync(command, args, {
    cwd: options?.cwd ?? repoRoot,
    env: {
      ...process.env,
      ...options?.env,
    },
    encoding: "utf8",
    stdio: options?.quiet ? "pipe" : "inherit",
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const detail = stderr ? `\n${stderr}` : "";
    throw new Error(`Command failed: ${command} ${args.join(" ")}${detail}`);
  }

  return result;
}

function runPnpm(args: string[], env?: Record<string, string | undefined>) {
  if (process.env.npm_execpath) {
    return runCommand(
      process.execPath,
      [process.env.npm_execpath, "-C", appRoot, ...args],
      { env },
    );
  }

  return runCommand("corepack", ["pnpm", "-C", appRoot, ...args], {
    env,
  });
}

async function waitForPostgres() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < PG_READY_TIMEOUT_MS) {
    const result = spawnSync(
      "docker",
      ["compose", "exec", "-T", "postgres", "pg_isready", "-U", "townpet", "-d", "townpet"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: "pipe",
      },
    );

    if (result.status === 0) {
      return;
    }

    await sleep(PG_READY_POLL_MS);
  }

  throw new Error("Timed out while waiting for local postgres to become ready.");
}

async function main() {
  console.log("[restore-local-dev] starting docker postgres...");
  runCommand("docker", ["compose", "up", "-d", "postgres"], { cwd: repoRoot });

  console.log("[restore-local-dev] waiting for postgres readiness...");
  await waitForPostgres();

  console.log("[restore-local-dev] syncing prisma schema...");
  runPnpm(["db:push"]);
  runPnpm(["exec", "prisma", "generate"]);

  const seedEnv = {
    SEED_DEFAULT_PASSWORD: LOCAL_SEED_PASSWORD,
  };

  const seedSteps = [
    "db:seed",
    "db:seed:users",
    "db:seed:local-test-accounts",
    "db:seed:board-posts",
    "db:seed:adoption-demo",
    "db:seed:comment-best-demo",
    "db:seed:search-cases",
    "db:seed:reports",
    "db:seed:engagement",
  ];

  for (const step of seedSteps) {
    console.log(`[restore-local-dev] running ${step}...`);
    runPnpm([step], seedEnv);
  }

  const [userCount, postCount, commentCount, reportCount, postReactionCount, commentReactionCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.comment.count(),
      prisma.report.count(),
      prisma.postReaction.count(),
      prisma.commentReaction.count(),
    ]);

  const passwordSummary = await prisma.user.aggregate({
    _count: {
      _all: true,
      passwordHash: true,
    },
    where: {
      passwordHash: {
        not: null,
      },
    },
  });

  const withPassword = passwordSummary._count._all;
  const withoutPassword = userCount - withPassword;

  console.log(
    JSON.stringify(
      {
        seedPassword: LOCAL_SEED_PASSWORD,
        users: userCount,
        withPassword,
        withoutPassword,
        posts: postCount,
        comments: commentCount,
        reports: reportCount,
        postReactions: postReactionCount,
        commentReactions: commentReactionCount,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("[restore-local-dev] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
