import fs from "node:fs";
import path from "node:path";

type Mode = "general" | "policy" | "performance" | "docs";
type Risk = "low" | "medium" | "high";

type Options = {
  goal: string;
  nonGoal: string;
  scope: string;
  policyImpact: string;
  dataImpact: string;
  risk: Risk;
  done: string;
  mode: Mode;
  out?: string;
};

const MODE_HINTS: Record<Mode, string> = {
  general: "",
  policy: "- Prioritize policy invariants and explicit failure handling.",
  performance: "- Define baseline and post-change metrics (p50/p95).",
  docs: "- Keep PLAN/PROGRESS synchronization explicit.",
};

function printUsage(): void {
  console.log(`Usage:
  pnpm -C app agent:prompt --goal "<goal>" [options]

Options:
  --goal <text>            Required.
  --non-goal <text>        Default: "none"
  --scope <text>           Default: "TBD"
  --policy-impact <text>   Default: "none"
  --data-impact <text>     Default: "none"
  --risk <low|medium|high> Default: "medium"
  --done <text>            Default: lint/typecheck + targeted tests + 1 failure-path test
  --mode <general|policy|performance|docs>  Default: "general"
  --out <path>             Write output to file (otherwise stdout)
  --help                   Show this message
`);
}

function parseArgs(argv: string[]): Options | null {
  const args = new Map<string, string>();

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    if (key === "help") {
      printUsage();
      return null;
    }

    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    args.set(key, value);
    i += 1;
  }

  const goal = args.get("goal");
  if (!goal) {
    throw new Error("Missing required argument: --goal");
  }

  const riskRaw = (args.get("risk") ?? "medium").toLowerCase();
  if (!["low", "medium", "high"].includes(riskRaw)) {
    throw new Error(`Invalid --risk value: ${riskRaw}`);
  }

  const modeRaw = (args.get("mode") ?? "general").toLowerCase();
  if (!["general", "policy", "performance", "docs"].includes(modeRaw)) {
    throw new Error(`Invalid --mode value: ${modeRaw}`);
  }

  return {
    goal,
    nonGoal: args.get("non-goal") ?? "none",
    scope: args.get("scope") ?? "TBD",
    policyImpact: args.get("policy-impact") ?? "none",
    dataImpact: args.get("data-impact") ?? "none",
    risk: riskRaw as Risk,
    done:
      args.get("done") ??
      "lint/typecheck + targeted tests (including at least 1 failure-path test)",
    mode: modeRaw as Mode,
    out: args.get("out"),
  };
}

function renderPrompt(options: Options): string {
  const lines = [
    "[Context]",
    "- Keep existing stack by default.",
    "- Respect TownPet invariants: Local/Global separation, high-risk policy-first, report auto-hide + auditability.",
    "- Follow implementation order for behavior/policy changes: Prisma -> Zod -> Service -> Action/Route -> UI -> Tests.",
    "- Do not introduce unverified DIY in auth/report/sanction/rate-limit flows.",
  ];

  const modeHint = MODE_HINTS[options.mode];
  if (modeHint) {
    lines.push(modeHint);
  }

  return `${lines.join("\n")}

[Task]
Goal: ${options.goal}
Non-goal: ${options.nonGoal}
Scope (files/layers): ${options.scope}
Policy impact (Local/Global, report/sanction, new-user restrictions): ${options.policyImpact}
Data impact (schema/migration): ${options.dataImpact}
Risk: ${options.risk}
Definition of done (behavior + verification commands): ${options.done}

[Expected Output]
1) Change summary (what/why)
2) Changed files
3) Policy check result
4) Failure-path test result (at least one)
5) Ops impact (deploy/monitoring/rollback)
6) Residual risks
`;
}

function main(): void {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (!options) {
      return;
    }

    const prompt = renderPrompt(options);
    if (!options.out) {
      console.log(prompt);
      return;
    }

    const outputPath = path.resolve(process.cwd(), options.out);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, prompt, "utf8");
    console.log(`Prompt template written: ${outputPath}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(message);
    printUsage();
    process.exitCode = 1;
  }
}

main();
