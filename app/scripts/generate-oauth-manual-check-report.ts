import fs from "node:fs";
import path from "node:path";

type ProviderStatus = "pending" | "pass" | "fail";
type BaseUrlCheckLevel = "ok" | "warn" | "error";

type BaseUrlCheck = {
  level: BaseUrlCheckLevel;
  message: string;
};

type CliOptions = {
  baseUrl: string;
  date: string;
  runUrl: string;
  kakaoStatus: ProviderStatus;
  naverStatus: ProviderStatus;
  strictBaseUrl: boolean;
  out?: string;
};

const DEFAULT_BASE_URL = "https://townpet.vercel.app";
const DEFAULT_RUN_URL =
  "https://github.com/answndud/townpet/actions/workflows/oauth-real-e2e.yml";

function usage() {
  console.log(`Usage:
  cd app && pnpm exec tsx scripts/generate-oauth-manual-check-report.ts [options]

Options:
  --base-url <url>           Base URL (default: ${DEFAULT_BASE_URL})
  --date <YYYY-MM-DD>        Check date (default: today, local)
  --run-url <url>            oauth-real-e2e run URL
  --kakao-status <status>    pending | pass | fail (default: pending)
  --naver-status <status>    pending | pass | fail (default: pending)
  --strict-base-url <0|1>    Fail when base URL has high-risk config (default: 0)
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

function parseBoolean(input: string, key: string) {
  const normalized = input.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }

  throw new Error(`Invalid ${key} value: ${input}`);
}

function isLocalHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

export function evaluateBaseUrl(baseUrl: string) {
  const parsed = new URL(baseUrl);
  const hostname = parsed.hostname.toLowerCase();
  const checks: BaseUrlCheck[] = [];

  if (parsed.protocol !== "https:" && !isLocalHost(hostname)) {
    checks.push({
      level: "error",
      message:
        "운영 도메인은 https 프로토콜이어야 합니다. (http는 OAuth 콜백 실패 위험)",
    });
  }

  if (hostname.endsWith("vercel.com")) {
    checks.push({
      level: "error",
      message:
        "vercel.com 도메인은 앱 공개 도메인이 아닙니다. Vercel Login으로 리다이렉트될 수 있습니다.",
    });
  }

  if (hostname.includes("-projects.vercel.app")) {
    checks.push({
      level: "error",
      message:
        "Vercel 프로젝트 보호(-projects.vercel.app) 도메인입니다. OAuth 콜백이 SSO 로그인으로 튈 수 있습니다.",
    });
  }

  if (hostname.includes("-git-") && hostname.endsWith(".vercel.app")) {
    checks.push({
      level: "warn",
      message:
        "Preview 배포 도메인으로 보입니다. 운영 OAuth 점검은 고정 프로덕션 도메인으로 수행하세요.",
    });
  }

  if (checks.length === 0) {
    checks.push({
      level: "ok",
      message: "Base URL 위험 신호 없음",
    });
  }

  return {
    parsed,
    checks,
    hasError: checks.some((check) => check.level === "error"),
  };
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
  const strictBaseUrl = parseBoolean(
    args.get("strict-base-url") ?? "0",
    "--strict-base-url",
  );
  const out = args.get("out");

  return {
    baseUrl,
    date,
    runUrl,
    kakaoStatus,
    naverStatus,
    strictBaseUrl,
    out,
  };
}

export function renderDoneSnippet(options: CliOptions, baseUrlChecks: BaseUrlCheck[]) {
  const baseUrlError = baseUrlChecks.some((check) => check.level === "error");
  const lines = [
    `### ${options.date}: OAuth 실계정 수동 점검 (Kakao/Naver)`,
    "- 점검 범위",
    "- 카카오/네이버 로그인 -> 온보딩 -> 피드 진입",
    "- 자동 검증 run",
    `- ${options.runUrl}`,
    "- Provider별 결과",
    `- Kakao: \`${options.kakaoStatus}\` (증적: <screenshot-or-video-link>)`,
    `- Naver: \`${options.naverStatus}\` (증적: <screenshot-or-video-link>)`,
    `- Base URL sanity: \`${baseUrlError ? "fail" : "pass"}\``,
    "- 후속 조치",
    "- [ ] Base URL sanity가 fail이면 콜백 도메인(운영 고정 URL)부터 수정 후 재점검",
    "- [ ] 두 provider 모두 `pass`면 `docs/DONE.md`에 완료 요약을 남기고 `docs/PLAN.md`의 관련 blocked 항목을 제거",
    "- [ ] 하나라도 `fail`이면 장애 원인/재시도 계획 기록",
  ];

  return `${lines.join("\n")}\n`;
}

export function renderMarkdown(options: CliOptions, baseUrlChecks: BaseUrlCheck[]) {
  const loginUrl = `${options.baseUrl}/login?next=%2Fonboarding`;
  const callbackKakao = `${options.baseUrl}/api/auth/callback/kakao`;
  const callbackNaver = `${options.baseUrl}/api/auth/callback/naver`;
  const lines: string[] = [];

  lines.push(`# OAuth Manual Check Report - ${options.date}`);
  lines.push("");
  lines.push(`- Base URL: ${options.baseUrl}`);
  lines.push(`- oauth-real-e2e run: ${options.runUrl}`);
  lines.push("");
  lines.push("## Base URL Sanity");
  lines.push("| Level | Check |");
  lines.push("|---|---|");
  for (const check of baseUrlChecks) {
    lines.push(`| ${check.level.toUpperCase()} | ${check.message} |`);
  }
  lines.push("");
  lines.push("## Expected Callback URLs");
  lines.push(`- Kakao: \`${callbackKakao}\``);
  lines.push(`- Naver: \`${callbackNaver}\``);
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
  lines.push("- [ ] Base URL sanity `ERROR`가 있으면 Provider 콘솔 Redirect URI부터 수정.");
  lines.push("- [ ] If both providers are pass, append the summary to `docs/DONE.md` and remove the matching blocked item from `docs/PLAN.md`.");
  lines.push("- [ ] If any provider fails, log incident + retry owner/date.");
  lines.push("");
  lines.push("## DONE.md Snippet");
  lines.push("```md");
  lines.push(renderDoneSnippet(options, baseUrlChecks).trimEnd());
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

    const baseUrlEvaluation = evaluateBaseUrl(options.baseUrl);
    const markdown = renderMarkdown(options, baseUrlEvaluation.checks);
    if (!options.out) {
      console.log(markdown);
    } else {
      const outputPath = path.resolve(process.cwd(), options.out);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, markdown, "utf8");
      console.log(`OAuth manual report file written: ${outputPath}`);
    }

    if (options.strictBaseUrl && baseUrlEvaluation.hasError) {
      console.error("Base URL sanity check failed in strict mode.");
      process.exitCode = 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(message);
    usage();
    process.exitCode = 1;
  }
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("generate-oauth-manual-check-report.ts")
) {
  main();
}
