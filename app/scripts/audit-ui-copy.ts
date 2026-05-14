import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

type Severity = "P0" | "P1" | "P2" | "P3";

type Rule = {
  id: string;
  severity: Severity;
  pattern: RegExp;
  reason: string;
  suggestion: string;
};

type Finding = {
  file: string;
  line: number;
  severity: Severity;
  ruleId: string;
  text: string;
  reason: string;
  suggestion: string;
};

const strict = process.argv.includes("--strict");
const root = process.cwd();
const scanRoots = ["src/app", "src/components", "src/lib", "src/server/actions", "src/server/services"];
const allowedExtensions = new Set([".ts", ".tsx"]);
const excludedSegments = new Set(["node_modules", ".next", "coverage"]);
const excludedFilePatterns = [/\.test\.(ts|tsx)$/u, /\.spec\.(ts|tsx)$/u];

const rules: Rule[] = [
  {
    id: "raw-board-enum-visible",
    severity: "P0",
    pattern:
      /\b(LOST_FOUND|HOSPITAL_REVIEW|PRODUCT_REVIEW|CARE_REQUEST|MEETUP|MARKET_LISTING)\s*(게시판|글|검색|필터|카테고리)/u,
    reason: "사용자 화면에 내부 게시글 enum이 노출될 가능성이 있습니다.",
    suggestion: "postTypeMeta 또는 getPostTypeMeta의 한국어 label을 사용하세요.",
  },
  {
    id: "raw-status-visible",
    severity: "P1",
    pattern: /\b(ACTIVE|PENDING|RESOLVED|DISMISSED|ALL_ACTIVE)\s*(글|댓글|상태|범위|게시글)/u,
    reason: "내부 상태값이 사용자 또는 운영자 UI 문구로 노출될 가능성이 있습니다.",
    suggestion: "`공개 중`, `검토 대기`, `조치 완료`, `조치 없음`처럼 한국어 상태명으로 바꾸세요.",
  },
  {
    id: "english-korean-mixed-button",
    severity: "P1",
    pattern: /entry 저장|townpet-user|YouTube video preview/u,
    reason: "한국어 UI 안에 불필요한 영어 또는 내부명처럼 보이는 예시가 남아 있습니다.",
    suggestion: "맥락에 맞는 한국어 버튼/placeholder/title 문구로 바꾸세요.",
  },
  {
    id: "awkward-direct-translation",
    severity: "P1",
    pattern: /전역 검색|플래그|모집중|검토중|진행중|온동네/u,
    reason: "한국인 대상 커뮤니티에서 어색하거나 띄어쓰기가 맞지 않는 표현입니다.",
    suggestion: "`전체 검색`, `의심 신호`, `모집 중`, `검토 중`, `진행 중`처럼 바꾸세요.",
  },
  {
    id: "board-copy-category",
    severity: "P2",
    pattern: /선택한 카테고리|해당 카테고리|카테고리\/범위|다른 카테고리|고위험 카테고리|차단 카테고리|제한 카테고리/u,
    reason: "게시판 선택 맥락에서 `카테고리`가 모호하게 보일 수 있습니다.",
    suggestion: "글 유형이 아니라 게시판을 뜻하면 `게시판`으로 바꾸세요.",
  },
  {
    id: "review-term-inconsistent",
    severity: "P2",
    pattern: /후기\/리뷰|용품리뷰|병원후기|동네모임|리뷰 카테고리/u,
    reason: "후기/리뷰와 띄어쓰기 표현이 화면별로 어긋날 수 있습니다.",
    suggestion: "`병원 후기`, `장소 후기`, `용품 후기`, `동네 모임`, `후기 유형`으로 맞추세요.",
  },
  {
    id: "market-term-warning",
    severity: "P3",
    pattern: /마켓 (상태|글|거래)|마켓 상태|마켓 글/u,
    reason: "`마켓`이 서비스 고유명으로 의도되지 않았다면 한국어 거래 맥락에서 딱딱하게 보입니다.",
    suggestion: "사용자-facing 문구에서는 `거래` 또는 `중고·공동구매`로 바꾸세요.",
  },
];

function walk(dir: string): string[] {
  const absolute = path.join(root, dir);
  let entries: string[] = [];

  for (const name of readdirSync(absolute)) {
    if (excludedSegments.has(name)) {
      continue;
    }

    const itemPath = path.join(absolute, name);
    const relativePath = path.relative(root, itemPath);
    const stats = statSync(itemPath);

    if (stats.isDirectory()) {
      entries = entries.concat(walk(relativePath));
      continue;
    }

    if (!allowedExtensions.has(path.extname(name))) {
      continue;
    }

    if (excludedFilePatterns.some((pattern) => pattern.test(name))) {
      continue;
    }

    entries.push(relativePath);
  }

  return entries;
}

function collectFindings(file: string): Finding[] {
  const source = readFileSync(path.join(root, file), "utf8");
  const lines = source.split(/\r?\n/u);
  const findings: Finding[] = [];

  lines.forEach((lineText, index) => {
    for (const rule of rules) {
      if (!rule.pattern.test(lineText)) {
        continue;
      }

      findings.push({
        file,
        line: index + 1,
        severity: rule.severity,
        ruleId: rule.id,
        text: lineText.trim(),
        reason: rule.reason,
        suggestion: rule.suggestion,
      });
    }
  });

  return findings;
}

const files = scanRoots.flatMap((scanRoot) => walk(scanRoot));
const findings = files.flatMap(collectFindings);
const blockingFindings = findings.filter((finding) => finding.severity === "P0" || finding.severity === "P1");

if (findings.length === 0) {
  console.log("UI copy audit: no risky copy patterns found.");
  process.exit(0);
}

console.log(`UI copy audit: ${findings.length} finding(s).`);
for (const finding of findings) {
  console.log(
    [
      `${finding.severity} ${finding.ruleId}`,
      `${finding.file}:${finding.line}`,
      finding.reason,
      `Suggestion: ${finding.suggestion}`,
      `Text: ${finding.text}`,
    ].join("\n"),
  );
  console.log("");
}

if (strict && blockingFindings.length > 0) {
  console.error(`UI copy audit strict failed: ${blockingFindings.length} P0/P1 finding(s).`);
  process.exit(1);
}
