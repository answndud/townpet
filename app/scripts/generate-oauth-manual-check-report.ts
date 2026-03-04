import fs from "node:fs";
import path from "node:path";

type ProviderStatus = "pending" | "pass" | "fail";

type CliOptions = {
  baseUrl: string;
  date: string;
  runUrl: string;
  kakaoStatus: ProviderStatus;
  naverStatus: ProviderStatus;
  out?: string;
};

const DEFAULT_BASE_URL = "https://townpet2.vercel.app";
const DEFAULT_RUN_URL =
  "https://github.com/answndud/townpet2/actions/workflows/oauth-real-e2e.yml";

function usage() {
  console.log(`Usage:
  pnpm -C app ops:oauth:manual-report [options]

Options:
  --base-url <url>           Base URL (default: ${DEFAULT_BASE_URL})
  --date <YYYY-MM-DD>        Check date (default: today, local)
  --run-url <url>            oauth-real-e2e run URL
  --kakao-status <status>    pending | pass | fail (default: pending)
  --naver-status <status>    pending | pass | fail (default: pending)
  --out <path>               Output file path (default: stdout)
  --help                     Show this help
`);
}

function resolveTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseStatus(input: string, key: string): ProviderStatus {
  const normalized = input.toLowerCase();
  if (!["pending", "pass", "fail"].includes(normalized)) {
    throw new Error(`Invalid ${key} value: ${input}`);
  }
  return normalized as ProviderStatus;
}

function parseArgs(argv: string[]): CliOptions | null {
  const args = new Map<string, string>();

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    if (key === "help") {
      usage();
      return null;
    }

    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    args.set(key, value);
    i += 1;
  }

  const baseUrlRaw = args.get("base-url") ?? DEFAULT_BASE_URL;
  const parsedBase = new URL(baseUrlRaw);
  const baseUrl = parsedBase.toString().replace(/\/$/, "");
  const date = args.get("date") ?? resolveTodayDate();
  const runUrl = args.get("run-url") ?? DEFAULT_RUN_URL;
  const kakaoStatus = parseStatus(
    args.get("kakao-status") ?? "pending",
    "--kakao-status",
  );
  const naverStatus = parseStatus(
    args.get("naver-status") ?? "pending",
    "--naver-status",
  );
  const out = args.get("out");

  return { baseUrl, date, runUrl, kakaoStatus, naverStatus, out };
}

function renderProgressSnippet(options: CliOptions) {
  const lines = [
    `### ${options.date}: OAuth 실계정 수동 점검 (Kakao/Naver)`,
    "- 점검 범위",
    "- 카카오/네이버 로그인 -> 온보딩 -> 피드 진입",
    "- 자동 검증 run",
    `- ${options.runUrl}`,
    "- Provider별 결과",
    `- Kakao: \`${options.kakaoStatus}\` (증적: <screenshot-or-video-link>)`,
    `- Naver: \`${options.naverStatus}\` (증적: <screenshot-or-video-link>)`,
    "- 후속 조치",
    "- [ ] 두 provider 모두 `pass`면 PLAN Cycle 23 `blocked -> done` 갱신",
    "- [ ] 하나라도 `fail`이면 장애 원인/재시도 계획 기록",
  ];

  return `${lines.join("\n")}\n`;
}

function renderMarkdown(options: CliOptions) {
  const loginUrl = `${options.baseUrl}/login?next=%2Fonboarding`;
  const lines: string[] = [];

  lines.push(`# OAuth Manual Check Report - ${options.date}`);
  lines.push("");
  lines.push(`- Base URL: ${options.baseUrl}`);
  lines.push(`- oauth-real-e2e run: ${options.runUrl}`);
  lines.push("");
  lines.push("## Provider Checks");
  lines.push("| Provider | Status | Account | Start URL | Evidence | Notes |");
  lines.push("|---|---|---|---|---|---|");
  lines.push(
    `| Kakao | ${options.kakaoStatus} |  | ${loginUrl} | screenshot/video link |  |`,
  );
  lines.push(
    `| Naver | ${options.naverStatus} |  | ${loginUrl} | screenshot/video link |  |`,
  );
  lines.push("");
  lines.push("## Follow-up");
  lines.push(
    "- [ ] If both providers are pass, update PLAN Cycle 23 blocked items to done.",
  );
  lines.push("- [ ] If any provider fails, log incident + retry owner/date.");
  lines.push("");
  lines.push("## PROGRESS.md Snippet");
  lines.push("```md");
  lines.push(renderProgressSnippet(options).trimEnd());
  lines.push("```");
  lines.push("");

  return `${lines.join("\n")}`;
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (!options) {
      return;
    }

    const markdown = renderMarkdown(options);
    if (!options.out) {
      console.log(markdown);
      return;
    }

    const outputPath = path.resolve(process.cwd(), options.out);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, markdown, "utf8");
    console.log(`OAuth manual report file written: ${outputPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(message);
    usage();
    process.exitCode = 1;
  }
}

main();
