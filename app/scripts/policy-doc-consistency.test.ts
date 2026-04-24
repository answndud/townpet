import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "../..");

function readRepoFile(path: string) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("policy documentation consistency", () => {
  it("does not reintroduce fixed three-report auto-hide wording", () => {
    const files = [
      "business/product/게시글_코어.md",
      "business/policies/신고_운영정책.md",
      "business/policies/모더레이션_운영규칙.md",
    ];

    for (const file of files) {
      const content = readRepoFile(file);
      expect(content, file).not.toMatch(/신고\s*(?:누적\s*)?3건\s*이상(?:이면|이면\s*)/);
      expect(content, file).not.toContain("Report 생성 후 POST 신고 누적 3건 이상");
    }
  });

  it("keeps the current weighted post auto-hide rule documented", () => {
    const postCore = readRepoFile("business/product/게시글_코어.md");
    const reportingPolicy = readRepoFile("business/policies/신고_운영정책.md");

    for (const content of [postCore, reportingPolicy]) {
      expect(content).toContain("신고 3건 고정 규칙");
      expect(content).toContain("고유 신고자");
      expect(content).toContain("누적 가중치");
      expect(content).toContain("Post.status=HIDDEN");
      expect(content).toContain("Comment 대상");
    }
  });
});
