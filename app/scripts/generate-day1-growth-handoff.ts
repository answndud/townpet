import fs from "node:fs";
import path from "node:path";

type Channel = {
  name: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  postTask: string;
  evidenceHint: string;
};

const DEFAULT_BASE_URL = "https://townpet.vercel.app";

const CHANNELS: Channel[] = [
  {
    name: "Naver Blog",
    source: "naver",
    medium: "blog",
    campaign: "day1_ondongne",
    content: "seed-post-1",
    postTask: "시작가이드/질문 템플릿 게시 1건",
    evidenceHint: "게시 URL + 스크린샷",
  },
];

type CliOptions = {
  baseUrl: string;
  date: string;
  out?: string;
};

function usage() {
  console.log(`Usage:
  pnpm -C app growth:day1:handoff [options]

Options:
  --base-url <url>   Base landing URL (default: ${DEFAULT_BASE_URL})
  --date <YYYY-MM-DD>  Execution date (default: today, local)
  --out <path>       Output file path (default: stdout)
  --help             Show this help
`);
}

function resolveTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const out = args.get("out");

  return { baseUrl, date, out };
}

function buildTrackedUrl(baseUrl: string, channel: Channel) {
  const url = new URL(`${baseUrl}/feed`);
  url.searchParams.set("utm_source", channel.source);
  url.searchParams.set("utm_medium", channel.medium);
  url.searchParams.set("utm_campaign", channel.campaign);
  url.searchParams.set("utm_content", channel.content);
  return url.toString();
}

function renderMarkdown(options: CliOptions) {
  const lines: string[] = [];
  lines.push(`# Day1 Growth Handoff - ${options.date}`);
  lines.push("");
  lines.push(`Base URL: ${options.baseUrl}`);
  lines.push("");
  lines.push("Mode: Naver-only reduced launch");
  lines.push("");
  lines.push("## 채널별 실행");
  lines.push("| Channel | Task | UTM URL | Evidence | Status |");
  lines.push("|---|---|---|---|---|");

  for (const channel of CHANNELS) {
    lines.push(
      `| ${channel.name} | ${channel.postTask} | ${buildTrackedUrl(options.baseUrl, channel)} | ${channel.evidenceHint} | pending |`,
    );
  }

  lines.push("");
  lines.push("## 24h Keep/Fix/Kill 점검");
  lines.push("| Metric | Target | Observed | Decision | Note |");
  lines.push("|---|---:|---:|---|---|");
  lines.push("| Read -> Signup | 18%+ |  | pending |  |");
  lines.push("| Signup -> First action (7d) | 30%+ |  | pending |  |");
  lines.push("| First post -> 24h first comment | 60%+ |  | pending |  |");
  lines.push("");
  lines.push("## 보류 채널");
  lines.push("- Kakao Open Chat: Day1 범위에서 제외");
  lines.push("- Instagram: Day1 범위에서 제외");
  lines.push("");
  lines.push("## 실행 로그");
  lines.push("- [ ] Naver 게시 1건 완료");
  lines.push("- [ ] UTM 유입 로그 수집 시작");
  lines.push("");

  return `${lines.join("\n")}\n`;
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
    console.log(`Day1 handoff file written: ${outputPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(message);
    usage();
    process.exitCode = 1;
  }
}

main();
