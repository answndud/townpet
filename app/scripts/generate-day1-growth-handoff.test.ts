import { describe, expect, it } from "vitest";

import { DEFAULT_BASE_URL, buildTrackedUrl, renderMarkdown } from "./generate-day1-growth-handoff";

describe("generate day1 growth handoff", () => {
  it("builds the expected Naver UTM feed URL", () => {
    const url = buildTrackedUrl("https://townpet.vercel.app/", {
      name: "Naver Blog",
      source: "naver",
      medium: "blog",
      campaign: "day1_ondongne",
      content: "seed-post-1",
      postTask: "시작가이드/질문 템플릿 게시 1건",
      evidenceHint: "게시 URL + 스크린샷",
    });

    expect(url).toBe(
      "https://townpet.vercel.app/feed?utm_source=naver&utm_medium=blog&utm_campaign=day1_ondongne&utm_content=seed-post-1",
    );
  });

  it("renders a Naver-only handoff with keep/fix/kill metrics", () => {
    const markdown = renderMarkdown({
      baseUrl: DEFAULT_BASE_URL,
      date: "2026-06-07",
    });

    expect(markdown).toContain("# Day1 Growth Handoff - 2026-06-07");
    expect(markdown).toContain("Mode: Naver-only reduced launch");
    expect(markdown).toContain("https://townpet.vercel.app/feed?utm_source=naver");
    expect(markdown).toContain("| Read -> Signup | 18%+ |");
    expect(markdown).toContain("- Kakao Open Chat: Day1 범위에서 제외");
    expect(markdown).toContain("- Instagram: Day1 범위에서 제외");
  });
});
