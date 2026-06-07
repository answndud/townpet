import { describe, expect, it } from "vitest";

import { renderPrompt } from "./generate-agent-prompt";
import { evaluateBaseUrl, renderMarkdown } from "./generate-oauth-manual-check-report";
import { buildOAuthManualCheckVerification } from "./verify-oauth-manual-check";

const staleHarnessCopy = new RegExp(
  [
    "PROGRESS\\.md",
    `PLAN/${"PROGRESS"}`,
    `Cycle ${"23"}`,
    `blocked ${"->"} done`,
  ].join("|"),
);

describe("state harness helper copy", () => {
  it("renders OAuth manual reports with PLAN/DONE archive guidance", () => {
    const baseUrlChecks = evaluateBaseUrl("https://townpet.vercel.app").checks;
    const markdown = renderMarkdown(
      {
        baseUrl: "https://townpet.vercel.app",
        date: "2026-06-07",
        runUrl: "https://github.com/answndud/townpet/actions/runs/1",
        kakaoStatus: "pass",
        naverStatus: "pass",
        strictBaseUrl: false,
      },
      baseUrlChecks,
    );

    expect(markdown).toContain("## DONE.md Snippet");
    expect(markdown).toContain("docs/DONE.md");
    expect(markdown).toContain("docs/PLAN.md");
    expect(markdown).not.toMatch(staleHarnessCopy);
  });

  it("does not mark OAuth manual checks ready when evidence is still placeholder text", () => {
    const verification = buildOAuthManualCheckVerification(`
| Provider | Status | Account | Start URL | Evidence | Notes |
|---|---|---|---|---|---|
| Kakao | pass |  | https://townpet.vercel.app/login?next=%2Fonboarding | screenshot/video link |  |
| Naver | pass |  | https://townpet.vercel.app/login?next=%2Fonboarding | https://evidence.example/naver.mp4 |  |
`);

    expect(verification.readyToArchive).toBe(false);
    expect(verification.providers.find((row) => row.provider === "Kakao")).toMatchObject({
      evidenceReady: false,
      ready: false,
    });
  });

  it("renders docs agent prompts with PLAN/DONE synchronization guidance", () => {
    const prompt = renderPrompt({
      goal: "운영 문서 링크 정리",
      nonGoal: "앱 동작 변경",
      scope: "docs, business/operations",
      policyImpact: "none",
      dataImpact: "none",
      risk: "low",
      done: "targeted tests + docs index check",
      mode: "docs",
    });

    expect(prompt).toContain("PLAN/DONE synchronization");
    expect(prompt).not.toMatch(staleHarnessCopy);
  });
});
