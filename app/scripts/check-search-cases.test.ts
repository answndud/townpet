import { PostScope } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
  escapePipe,
  parseExistingResults,
  renderSearchCasesReport,
  runSearchCasesCheck,
  SEARCH_CASES,
} from "./check-search-cases";

describe("search cases check CLI wrapper", () => {
  it("escapes markdown table pipes", () => {
    expect(escapePipe("a|b|c")).toBe("a\\|b\\|c");
  });

  it("parses existing manual statuses and memos", () => {
    const existing = parseExistingResults(
      [
        "| ID | 질의 | 범위 | 기대 결과 | top5 결과 | 상태 | 메모 |",
        "|---|---|---|---|---|---|---|",
        "| 01 | 강남 산책 | ALL | 기대 | 결과 | PASS | 유지 |",
        "| 02 | 병원 | ALL | 기대 | 결과 | WARN | 확인 필요 |",
      ].join("\n"),
    );

    expect(existing.get("01")).toEqual({ status: "PASS", memo: "유지" });
    expect(existing.get("02")).toEqual({ status: "WARN", memo: "확인 필요" });
  });

  it("renders report summary and escaped rows", () => {
    expect(
      renderSearchCasesReport({
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        rows: [
          {
            id: "01",
            query: "a|b",
            searchIn: "ALL",
            expected: "기대|결과",
            topTitles: ["1. 제목|A"],
            status: "PASS",
            memo: "메모|1",
          },
          {
            id: "02",
            query: "없음",
            searchIn: "TITLE",
            expected: "빈 결과",
            topTitles: [],
            status: "FAIL",
            memo: "",
          },
        ],
      }),
    ).toBe(
      [
        "# 검색 수동점검 결과",
        "",
        "- 생성 시각: 2026-01-01T00:00:00.000Z",
        "- 실행 범위: GLOBAL / top5",
        "- 판정 규칙: 체크리스트 기준으로 PASS/WARN/FAIL 수동 기입",
        "",
        "| ID | 질의 | 범위 | 기대 결과 | top5 결과 | 상태 | 메모 |",
        "|---|---|---|---|---|---|---|",
        "| 01 | a\\|b | ALL | 기대\\|결과 | 1. 제목\\|A | PASS | 메모\\|1 |",
        "| 02 | 없음 | TITLE | 빈 결과 | (결과 없음) | FAIL |  |",
        "",
        "## 판정 요약",
        "- PASS: 1",
        "- WARN: 0",
        "- FAIL: 1",
        "",
      ].join("\n"),
    );
  });

  it("runs all search cases while preserving existing manual results", async () => {
    const readFile = vi.fn().mockResolvedValue(
      [
        "| ID | 질의 | 범위 | 기대 결과 | top5 결과 | 상태 | 메모 |",
        "|---|---|---|---|---|---|---|",
        "| 01 | 강남 산책 | ALL | 기대 | old result | PASS | 그대로 |",
      ].join("\n"),
    );
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const listRankedSearchPosts = vi.fn().mockResolvedValue([{ title: "검색 결과" }]);

    const result = await runSearchCasesCheck(
      {
        listRankedSearchPosts,
        readFile,
        writeFile,
      },
      {
        outputPath: "/tmp/search-report.md",
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    );

    expect(listRankedSearchPosts).toHaveBeenCalledTimes(SEARCH_CASES.length);
    expect(listRankedSearchPosts).toHaveBeenNthCalledWith(1, {
      limit: 5,
      scope: PostScope.GLOBAL,
      q: SEARCH_CASES[0].query,
      searchIn: SEARCH_CASES[0].searchIn,
    });
    expect(writeFile).toHaveBeenCalledWith("/tmp/search-report.md", result.report, "utf8");
    expect(result.message).toBe("Saved: /tmp/search-report.md");
    expect(result.report).toContain("| 01 | 강남 산책 | ALL | 강남 산책로 추천 | 1. 검색 결과 | PASS | 그대로 |");
  });
});
