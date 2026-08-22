import { config } from "dotenv";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

config({ quiet: true });
config({ path: resolve(process.cwd(), ".env.local"), override: false, quiet: true });

const appRoot = resolve(dirname(new URL(import.meta.url).pathname), "..");
const repoRoot = resolve(appRoot, "..");
const DEFAULT_OUTPUT_DIR = resolve(repoRoot, "backups");

type BackupEnv = {
  DATABASE_URL?: string;
  BACKUP_OUTPUT_DIR?: string;
  BACKUP_AGE_RECIPIENT?: string;
  BACKUP_AGE_IDENTITY_FILE?: string;
};

type CommandRunner = (command: string, args: string[]) => void;

export function validateBackupEnv(env: BackupEnv, mode: "backup" | "verify" = "backup") {
  const failures: string[] = [];
  if (!env.DATABASE_URL?.trim()) failures.push("DATABASE_URL is required");
  if (mode === "backup" && !env.BACKUP_AGE_RECIPIENT?.trim()) {
    failures.push("BACKUP_AGE_RECIPIENT is required");
  }
  if (mode === "verify" && !env.BACKUP_AGE_IDENTITY_FILE?.trim()) {
    failures.push("BACKUP_AGE_IDENTITY_FILE is required");
  }
  return failures;
}

export function resolveBackupOutputDir(env: BackupEnv = process.env as BackupEnv) {
  return resolve(env.BACKUP_OUTPUT_DIR?.trim() || DEFAULT_OUTPUT_DIR);
}

function runCommand(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command}`);
  }
}

function ensureTools(mode: "backup" | "verify") {
  const tools = mode === "backup" ? ["pg_dump", "age"] : ["age", "pg_restore"];
  for (const tool of tools) {
    if (!existsSync(resolve(process.env.PATH?.split(":")[0] ?? "", tool))) {
      const result = spawnSync("sh", ["-lc", `command -v ${tool}`], { stdio: "ignore" });
      if (result.status !== 0) throw new Error(`${tool} is required`);
    }
  }
}

export async function createLocalBackup(
  env: BackupEnv = process.env as BackupEnv,
  runner: CommandRunner = runCommand,
  now = new Date(),
) {
  const failures = validateBackupEnv(env, "backup");
  if (failures.length > 0) throw new Error(failures.join("; "));
  ensureTools("backup");

  const outputDir = resolveBackupOutputDir(env);
  await mkdir(outputDir, { recursive: true, mode: 0o700 });
  const timestamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const outputPath = resolve(outputDir, `townpet-${timestamp}.dump.age`);
  const temporaryDir = await mkdtemp(resolve(tmpdir(), "townpet-backup-"));
  const dumpPath = resolve(temporaryDir, `townpet-${timestamp}.dump`);
  const encryptedPath = resolve(temporaryDir, basename(outputPath));

  try {
    runner("pg_dump", ["--format=custom", "--no-owner", "--file", dumpPath, env.DATABASE_URL!.trim()]);
    runner("age", ["--encrypt", "--recipient", env.BACKUP_AGE_RECIPIENT!.trim(), "--output", encryptedPath, dumpPath]);
    await copyFile(encryptedPath, outputPath);
    return { outputPath, bytes: (await stat(outputPath)).size };
  } finally {
    await rm(temporaryDir, { recursive: true, force: true });
  }
}

export async function verifyLocalBackup(
  backupPath: string,
  env: BackupEnv = process.env as BackupEnv,
  runner: CommandRunner = runCommand,
) {
  const failures = validateBackupEnv(env, "verify");
  if (failures.length > 0) throw new Error(failures.join("; "));
  ensureTools("verify");
  const temporaryDir = await mkdtemp(resolve(tmpdir(), "townpet-restore-check-"));
  const decryptedPath = resolve(temporaryDir, "townpet-restore-check.dump");
  try {
    runner("age", ["--decrypt", "--identity", env.BACKUP_AGE_IDENTITY_FILE!.trim(), "--output", decryptedPath, resolve(backupPath)]);
    runner("pg_restore", ["--list", decryptedPath]);
    return { backupPath: resolve(backupPath), decryptedPath };
  } finally {
    await rm(temporaryDir, { recursive: true, force: true });
  }
}

async function main() {
  const mode = process.argv[2] === "--verify" ? "verify" : "backup";
  if (mode === "backup") {
    const result = await createLocalBackup();
    console.log(`[backup-local] encrypted backup created: ${result.outputPath} (${result.bytes} bytes)`);
    return;
  }

  const backupPath = process.argv.slice(3).find((argument) => argument !== "--");
  if (!backupPath) throw new Error("Usage: pnpm ops:db:backup:verify:local -- <backup-file>");
  await verifyLocalBackup(backupPath);
  console.log(`[backup-local] backup verified: ${resolve(backupPath)}`);
}

if (process.argv[1]?.endsWith("backup-local.ts")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
