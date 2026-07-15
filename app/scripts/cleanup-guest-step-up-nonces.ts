import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import {
  formatMaintenanceMode,
  isDryRunMode,
  resolveMaintenanceRunMode,
  type MaintenanceRunMode,
} from "./maintenance-run-mode";

type GuestStepUpNonceDelegate = {
  count(args: { where: { expiresAt: { lte: Date } } }): Promise<number>;
  deleteMany(args: { where: { expiresAt: { lte: Date } } }): Promise<{ count: number }>;
};

export function formatGuestStepUpNonceCleanupOutput(params: {
  mode: MaintenanceRunMode;
  count: number;
  cutoff: Date;
}) {
  const verb = isDryRunMode(params.mode) ? "Would delete" : "Deleted";
  const lines = [
    `${verb} ${params.count} expired guest step-up nonces before ${params.cutoff.toISOString()} (mode: ${formatMaintenanceMode(params.mode)}).`,
  ];
  if (isDryRunMode(params.mode)) {
    lines.push("Dry-run mode. Re-run with --apply to delete rows.");
  }
  return lines.join("\n");
}

export async function runGuestStepUpNonceCleanup(
  delegate: GuestStepUpNonceDelegate,
  now = new Date(),
) {
  const mode = resolveMaintenanceRunMode({
    applyEnvName: "GUEST_STEP_UP_NONCE_CLEANUP_APPLY",
  });
  const where = { expiresAt: { lte: now } } as const;
  const result = isDryRunMode(mode)
    ? { count: await delegate.count({ where }) }
    : await delegate.deleteMany({ where });

  return formatGuestStepUpNonceCleanupOutput({
    mode,
    count: result.count,
    cutoff: now,
  });
}

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log(await runGuestStepUpNonceCleanup(prisma.guestStepUpNonce));
  } finally {
    await prisma.$disconnect();
  }
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("cleanup-guest-step-up-nonces.ts")
) {
  main().catch((error) => {
    console.error("Guest step-up nonce cleanup failed", error);
    process.exit(1);
  });
}
