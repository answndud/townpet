import { describe, expect, it } from "vitest";

import {
  buildSearchTermStatVariants,
  detectSensitiveSearchSignals,
  normalizeSearchTerm,
  normalizeSearchTermForStats,
  redactSensitiveSearchTerm,
  sanitizeSearchTermForStats,
  shouldExcludeSearchTermFromStats,
} from "@/lib/search-term-privacy";

describe("search term privacy", () => {
  it("normalizes repeated whitespace for trackable terms", () => {
    expect(normalizeSearchTerm("  강아지   산책  ")).toBe("강아지 산책");
  });

  it("canonicalizes structured search variants for stats", () => {
    expect(normalizeSearchTermForStats("건강검진")).toBe("건강 검진");
    expect(buildSearchTermStatVariants("서울 마포구")).toContain("서울특별시 마포구");
  });

  it("filters out direct contact patterns from search stats", () => {
    expect(detectSensitiveSearchSignals("test@example.com")).toContain("email");
    expect(detectSensitiveSearchSignals("010-1234-5678")).toContain("phone");
    expect(shouldExcludeSearchTermFromStats("https://open.kakao.com/o/test-room")).toBe(true);
    expect(detectSensitiveSearchSignals("서울 마포구 월드컵로 123")).toContain("address");
    expect(detectSensitiveSearchSignals("Bearer abcdefghijklmnop")).toContain("token");
  });

  it("redacts sensitive fragments before a mixed search term can be stored", () => {
    expect(redactSensitiveSearchTerm("강아지 산책 test@example.com")).toBe(
      "강아지 산책 [이메일 비공개]",
    );
    expect(sanitizeSearchTermForStats("강아지 산책 010-1234-5678")).toBe(
      "강아지 산책 [연락처 비공개]",
    );
    expect(sanitizeSearchTermForStats("010-1234-5678")).toBeNull();
    expect(sanitizeSearchTermForStats("Bearer abcdefghijklmnop")).toBeNull();
  });

  it("keeps benign community queries trackable", () => {
    expect(shouldExcludeSearchTermFromStats("강아지 산책")).toBe(false);
    expect(detectSensitiveSearchSignals("동물병원 후기")).toEqual([]);
  });
});
