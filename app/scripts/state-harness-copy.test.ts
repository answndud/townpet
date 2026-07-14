import { describe, expect, it } from "vitest";

import { renderPrompt } from "./generate-agent-prompt";
import { evaluateBaseUrl, renderMarkdown } from "./generate-oauth-manual-check-report";
import {
  DEFAULT_REPORT_PATH as DEFAULT_UPDATE_REPORT_PATH,
  updateDoneSnippetLine,
  updateProviderRow,
} from "./update-oauth-manual-check";
import {
  DEFAULT_REPORT_PATH as DEFAULT_VERIFY_REPORT_PATH,
  buildOAuthManualCheckVerification,
} from "./verify-oauth-manual-check";

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

    expect(markdown).toContain("## Completion Summary");
    expect(markdown).toContain("docs/reports/");
    expect(markdown).toContain("PLAN.md");
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

  it("keeps OAuth manual check helper default paths under business operations", () => {
    expect(DEFAULT_UPDATE_REPORT_PATH).toBe(
      "../business/operations/manual-checks/OAuth_수동점검_기록_2026-03-05.md",
    );
    expect(DEFAULT_VERIFY_REPORT_PATH).toBe(DEFAULT_UPDATE_REPORT_PATH);
  });

  it("updates provider rows and DONE snippets without changing unrelated providers", () => {
    const options = {
      reportPath: DEFAULT_UPDATE_REPORT_PATH,
      provider: "Kakao" as const,
      status: "pass" as const,
      evidence: "https://evidence.example/kakao.mp4",
      account: "kakao-prod",
      notes: "ok",
    };

    expect(
      updateProviderRow(
        "| Kakao | pending |  | https://townpet.vercel.app/login?next=%2Fonboarding | screenshot/video link |  |",
        options,
      ),
    ).toBe(
      "| Kakao | pass | kakao-prod | https://townpet.vercel.app/login?next=%2Fonboarding | https://evidence.example/kakao.mp4 | ok |",
    );
    expect(
      updateProviderRow(
        "| Naver | pending |  | https://townpet.vercel.app/login?next=%2Fonboarding | screenshot/video link |  |",
        options,
      ),
    ).toBe(
      "| Naver | pending |  | https://townpet.vercel.app/login?next=%2Fonboarding | screenshot/video link |  |",
    );
    expect(updateDoneSnippetLine("- Kakao: `pending` (증적: <screenshot-or-video-link>)", options)).toBe(
      "- Kakao: `pass` (증적: https://evidence.example/kakao.mp4)",
    );
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
