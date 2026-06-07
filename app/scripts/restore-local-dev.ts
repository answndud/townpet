import "dotenv/config";
import { spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";
import { assertLocalDevelopmentDatabase } from "../src/server/local-database-guard";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const repoRoot = resolve(appRoot, "..");

const LOCAL_SEED_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "townpet123";
const PG_READY_TIMEOUT_MS = 120_000;
const PG_READY_POLL_MS = 2_000;
export const LOCAL_RESTORE_SEED_STEPS = [
  "db:seed",
  "db:seed:users",
  "db:seed:local-test-accounts",
  "db:seed:board-posts",
  "db:seed:care-demo",
  "db:seed:adoption-demo",
  "db:seed:comment-best-demo",
  "db:seed:search-cases",
  "db:seed:reports",
  "db:seed:engagement",
] as const;

type LocalRestorePrisma = Pick<
  PrismaClient,
  "comment" | "commentReaction" | "post" | "postReaction" | "report" | "user" | "$disconnect"
>;

type LocalRestoreDeps = {
  prisma: LocalRestorePrisma;
  runCommand: typeof runCommand;
  runPnpm: typeof runPnpm;
  waitForPostgres: typeof waitForPostgres;
};

type LocalRestoreSummary = {
  users: number;
  withPassword: number;
  withoutPassword: number;
  posts: number;
  comments: number;
  reports: number;
  postReactions: number;
  commentReactions: number;
};

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

export function buildPnpmCommand(args: string[], npmExecPath = process.env.npm_execpath) {
  if (npmExecPath) {
    return {
      command: process.execPath,
      args: [npmExecPath, "-C", appRoot, ...args],
    };
  }

  return {
    command: "corepack",
    args: ["pnpm", "-C", appRoot, ...args],
  };
}

function runPnpm(args: string[], env?: Record<string, string | undefined>) {
  const command = buildPnpmCommand(args);

  return runCommand(command.command, command.args, {
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

export function formatLocalRestoreSummary(summary: LocalRestoreSummary) {
  return JSON.stringify(summary, null, 2);
}

async function getLocalRestoreSummary(prisma: LocalRestorePrisma) {
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

  return {
    users: userCount,
    withPassword,
    withoutPassword,
    posts: postCount,
    comments: commentCount,
    reports: reportCount,
    postReactions: postReactionCount,
    commentReactions: commentReactionCount,
  };
}

export async function runLocalRestore(deps: LocalRestoreDeps) {
  assertLocalDevelopmentDatabase(process.env, "local restore/bootstrap");

  console.log("[restore-local-dev] starting docker postgres...");
  deps.runCommand("docker", ["compose", "up", "-d", "postgres"], { cwd: repoRoot });

  console.log("[restore-local-dev] waiting for postgres readiness...");
  await deps.waitForPostgres();

  console.log("[restore-local-dev] syncing prisma schema...");
  deps.runPnpm(["db:push"]);
  deps.runPnpm(["exec", "prisma", "generate"]);

  const seedEnv = {
    SEED_DEFAULT_PASSWORD: LOCAL_SEED_PASSWORD,
  };

  for (const step of LOCAL_RESTORE_SEED_STEPS) {
    console.log(`[restore-local-dev] running ${step}...`);
    deps.runPnpm([step], seedEnv);
  }

  const summary = await getLocalRestoreSummary(deps.prisma);
  console.log(formatLocalRestoreSummary(summary));

  return summary;
}

async function main(prisma: LocalRestorePrisma = new PrismaClient()) {
  await runLocalRestore({
    prisma,
    runCommand,
    runPnpm,
    waitForPostgres,
  });
}

if (process.env.NODE_ENV !== "test" && process.argv[1]?.endsWith("restore-local-dev.ts")) {
  const prisma = new PrismaClient();
  main(prisma)
    .catch((error) => {
      console.error("[restore-local-dev] failed", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
