import { describe, expect, it } from "vitest";

import {
  buildSearchChoseongText,
  buildSearchCompactText,
  buildSearchDocumentParts,
  hasChoseongSearchSignal,
  matchesSearchDocumentQuery,
  resolveSearchDocumentMatchRank,
} from "@/lib/search-document";

describe("search document helpers", () => {
  it("builds compact and choseong text from korean phrases", () => {
    const parts = buildSearchDocumentParts("건강 검진 24시");

    expect(parts.normalizedText).toBe("건강 검진 24시");
    expect(parts.compactText).toBe("건강검진24시");
    expect(parts.choseongText).toBe("ㄱㄱㄱㅈ24ㅅ");
  });

  it("matches compact whitespace-insensitive queries", () => {
    expect(matchesSearchDocumentQuery("건강 검진", "건강검진")).toBe(true);
  });

  it("matches korean initial-consonant queries", () => {
    expect(matchesSearchDocumentQuery("건강 검진", "ㄱㄱㄱ")).toBe(true);
    expect(buildSearchChoseongText("건강 검진")).toBe("ㄱㄱㄱㅈ");
    expect(hasChoseongSearchSignal("ㄱㄱㄱ")).toBe(true);
  });

  it("ranks prefix text matches ahead of compact and choseong matches", () => {
    expect(resolveSearchDocumentMatchRank("건강 검진", "건강")).toBe(0);
    expect(resolveSearchDocumentMatchRank("건강 검진", "건강검")).toBe(1);
    expect(resolveSearchDocumentMatchRank("건강 검진", "ㄱㄱ")).toBe(2);
  });

  it("removes punctuation in compact search text", () => {
    expect(buildSearchCompactText("서울·마포 / 병원")).toBe("서울마포병원");
  });
});
