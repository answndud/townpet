import fs from "node:fs";
import path from "node:path";

type Provider = "Kakao" | "Naver";
type ProviderStatus = "pending" | "pass" | "fail";

type CliOptions = {
  reportPath: string;
  provider: Provider;
  status: ProviderStatus;
  evidence: string;
  account?: string;
  notes?: string;
};

const DEFAULT_REPORT_PATH = "../docs/ops/manual-checks/oauth-manual-check-2026-03-05.md";

function usage() {
  console.log(`Usage:
  pnpm -C app ops:oauth:update-manual [options]

Options:
  --report <path>        Report markdown path (default: ${DEFAULT_REPORT_PATH})
  --provider <name>      kakao | naver
  --status <status>      pending | pass | fail
  --evidence <value>     Evidence link/path text
  --account <value>      Optional account label
  --notes <value>        Optional notes
  --help                 Show this help
`);
}

function parseProvider(value: string): Provider {
  const normalized = value.trim().toLowerCase();
  if (normalized === "kakao") {
    return "Kakao";
  }
  if (normalized === "naver") {
    return "Naver";
  }
  throw new Error(`Invalid --provider value: ${value}`);
}

function parseStatus(value: string): ProviderStatus {
  const normalized = value.trim().toLowerCase();
  if (normalized === "pending" || normalized === "pass" || normalized === "fail") {
    return normalized;
  }
  throw new Error(`Invalid --status value: ${value}`);
}

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    if (key === "help") {
      usage();
      return null;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    args.set(key, value);
    index += 1;
  }

  const providerRaw = args.get("provider");
  const statusRaw = args.get("status");
  const evidenceRaw = args.get("evidence");
  if (!providerRaw || !statusRaw || !evidenceRaw) {
    throw new Error("--provider, --status, --evidence are required.");
  }

  return {
    reportPath: args.get("report") ?? DEFAULT_REPORT_PATH,
    provider: parseProvider(providerRaw),
    status: parseStatus(statusRaw),
    evidence: evidenceRaw.trim(),
    account: args.get("account")?.trim(),
    notes: args.get("notes")?.trim(),
  } satisfies CliOptions;
}

function updateProviderRow(
  line: string,
  options: CliOptions,
) {
  if (!line.startsWith(`| ${options.provider} |`)) {
    return line;
  }

  const rawColumns = line.split("|");
  const columns = rawColumns.slice(1, -1).map((column) => column.trim());

  const startUrl = columns[3] ?? "";
  const account = options.account ?? columns[2] ?? "";
  const notes = options.notes ?? columns[5] ?? "";

  return `| ${options.provider} | ${options.status} | ${account} | ${startUrl} | ${options.evidence} | ${notes} |`;
}

function updateProgressSnippetLine(line: string, options: CliOptions) {
  const prefix = `- ${options.provider}: `;
  if (!line.startsWith(prefix) || !line.includes("(증적:")) {
    return line;
  }

  return `${prefix}\`${options.status}\` (증적: ${options.evidence})`;
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (!options) {
      return;
    }

    const resolvedPath = path.resolve(process.cwd(), options.reportPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Report file not found: ${resolvedPath}`);
    }

    const source = fs.readFileSync(resolvedPath, "utf8");
    const updated = source
      .split("\n")
      .map((line) => updateProviderRow(line, options))
      .map((line) => updateProgressSnippetLine(line, options))
      .join("\n");

    fs.writeFileSync(resolvedPath, updated, "utf8");
    console.log(`Updated ${options.provider} row in ${resolvedPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(message);
    usage();
    process.exitCode = 1;
  }
}

main();
