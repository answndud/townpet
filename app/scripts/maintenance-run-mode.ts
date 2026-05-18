export type MaintenanceRunMode = "dry-run" | "apply";

type ResolveMaintenanceRunModeParams = {
  argv?: string[];
  env?: Record<string, string | undefined>;
  dryRunEnvName?: string;
  applyEnvName?: string;
  defaultMode?: MaintenanceRunMode;
};

function hasTruthyFlag(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return ["1", "true", "yes", "y", "on"].includes(normalized);
}

export function resolveMaintenanceRunMode({
  argv = process.argv.slice(2),
  env = process.env,
  dryRunEnvName,
  applyEnvName,
  defaultMode = "dry-run",
}: ResolveMaintenanceRunModeParams = {}): MaintenanceRunMode {
  const dryRunRequested =
    argv.includes("--dry-run") || (dryRunEnvName ? hasTruthyFlag(env[dryRunEnvName]) : false);
  const applyRequested =
    argv.includes("--apply") || (applyEnvName ? hasTruthyFlag(env[applyEnvName]) : false);

  if (dryRunRequested && applyRequested) {
    throw new Error("Choose only one maintenance mode: --dry-run or --apply.");
  }

  if (applyRequested) {
    return "apply";
  }

  if (dryRunRequested) {
    return "dry-run";
  }

  return defaultMode;
}

export function isDryRunMode(mode: MaintenanceRunMode) {
  return mode === "dry-run";
}

export function formatMaintenanceMode(mode: MaintenanceRunMode) {
  return mode === "dry-run" ? "dry-run" : "apply";
}
