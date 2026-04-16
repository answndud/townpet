import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

type CommandResult = {
  code: number;
  output: string;
};

type CommandRunner = (
  command: string,
  args: string[],
) => Promise<CommandResult>;

const PRISMA_DEPLOY_MAX_ATTEMPTS = 4;
const PRISMA_DEPLOY_RETRY_DELAY_MS = 4_000;
const CURRENT_FILE_PATH = fileURLToPath(import.meta.url);

function runCommand(command: string, args: string[]) {
  return new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      cwd: process.cwd(),
      stdio: ["inherit", "pipe", "pipe"],
    });

    let output = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        output,
      });
    });
  });
}

function isBaselineRequired(output: string) {
  return output.includes("Error: P3005");
}

function isAlreadyAppliedError(output: string) {
  return output.includes("Error: P3008") || output.includes("already recorded as applied");
}

function isTransientPrismaDeployError(output: string) {
  return (
    output.includes("Error: P1001") ||
    output.includes("Error: P1002") ||
    output.includes("Can't reach database server") ||
    output.includes("Timed out") ||
    output.includes("ECONNRESET") ||
    output.includes("Connection terminated")
  );
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function hasTruthyFlag(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function isStrictVercelTarget(env: NodeJS.ProcessEnv = process.env) {
  const targetEnv = (env.VERCEL_TARGET_ENV ?? env.VERCEL_ENV ?? "").trim().toLowerCase();
  return targetEnv === "production" || targetEnv === "preview" || targetEnv === "staging";
}

export function shouldRunSecurityEnvPreflight(env: NodeJS.ProcessEnv = process.env) {
  if (hasTruthyFlag(env.DEPLOY_SECURITY_PREFLIGHT_SKIP)) {
    return false;
  }

  if (hasTruthyFlag(env.DEPLOY_SECURITY_PREFLIGHT_STRICT)) {
    return true;
  }

  return isStrictVercelTarget(env);
}

async function listMigrationNames() {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function baselineMigrations(commandRunner: CommandRunner = runCommand) {
  const migrations = await listMigrationNames();
  if (migrations.length === 0) {
    throw new Error("No Prisma migrations found in prisma/migrations.");
  }

  console.log("[build:vercel] P3005 detected. Running Prisma baseline resolve...");

  for (const migration of migrations) {
    const result = await commandRunner("pnpm", [
      "prisma",
      "migrate",
      "resolve",
      "--applied",
      migration,
    ]);

    if (result.code !== 0 && !isAlreadyAppliedError(result.output)) {
      throw new Error(`[build:vercel] Failed to resolve migration ${migration}`);
    }
  }
}

export async function runSecurityEnvPreflight(commandRunner: CommandRunner = runCommand) {
  if (!shouldRunSecurityEnvPreflight()) {
    console.log(
      "[build:vercel] skipping strict security env preflight (non-strict target or explicit opt-out).",
    );
    return;
  }

  const result = await commandRunner("pnpm", ["ops:check:security-env:strict"]);
  if (result.code !== 0) {
    throw new Error("[build:vercel] security env preflight failed.");
  }
}

async function runPrismaDeploy(commandRunner: CommandRunner = runCommand) {
  let baselineAttempted = false;

  for (let attempt = 1; attempt <= PRISMA_DEPLOY_MAX_ATTEMPTS; attempt += 1) {
    const deployResult = await commandRunner("pnpm", ["prisma", "migrate", "deploy"]);
    if (deployResult.code === 0) {
      return;
    }

    if (isBaselineRequired(deployResult.output) && !baselineAttempted) {
      baselineAttempted = true;
      await baselineMigrations(commandRunner);
      continue;
    }

    if (isTransientPrismaDeployError(deployResult.output) && attempt < PRISMA_DEPLOY_MAX_ATTEMPTS) {
      console.log(
        `[build:vercel] prisma migrate deploy transient failure (attempt ${attempt}/${PRISMA_DEPLOY_MAX_ATTEMPTS}). Retrying...`,
      );
      await sleep(PRISMA_DEPLOY_RETRY_DELAY_MS * attempt);
      continue;
    }

    throw new Error("[build:vercel] prisma migrate deploy failed.");
  }

  throw new Error("[build:vercel] prisma migrate deploy exhausted retry attempts.");
}

async function runPrismaGenerate(commandRunner: CommandRunner = runCommand) {
  const generateResult = await commandRunner("pnpm", ["prisma", "generate"]);
  if (generateResult.code !== 0) {
    throw new Error("[build:vercel] prisma generate failed.");
  }
}

export async function runBuildVercel(commandRunner: CommandRunner = runCommand) {
  await runSecurityEnvPreflight(commandRunner);
  await runPrismaDeploy(commandRunner);
  await runPrismaGenerate(commandRunner);

  const buildResult = await commandRunner("pnpm", ["next", "build"]);
  if (buildResult.code !== 0) {
    throw new Error("[build:vercel] next build failed.");
  }
}

export async function main() {
  await runBuildVercel();
}

if (process.argv[1] && path.resolve(process.argv[1]) === CURRENT_FILE_PATH) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
