import { describe, expect, it } from "vitest";

import {
  addRecentSearchTerm,
  buildRecentSearchesPayload,
  parseRecentSearches,
} from "@/lib/recent-search-storage";

describe("recent search storage", () => {
  const now = new Date("2026-05-11T00:00:00.000Z");

  it("stores recent searches with an expiry envelope", () => {
    const result = addRecentSearchTerm(["강아지 산책"], "고양이 병원", now);

    expect(result.stored).toBe(true);
    expect(result.items).toEqual(["고양이 병원", "강아지 산책"]);
    expect(result.payload).toMatchObject({
      savedAt: "2026-05-11T00:00:00.000Z",
      items: ["고양이 병원", "강아지 산책"],
    });
  });

  it("does not store contact or address searches in localStorage", () => {
    const result = addRecentSearchTerm(["강아지 산책"], "010-1234-5678", now);

    expect(result.stored).toBe(false);
    expect(result.items).toEqual(["강아지 산책"]);
    expect(result.payload.items).toEqual(["강아지 산책"]);
  });

  it("drops expired recent search payloads", () => {
    const payload = buildRecentSearchesPayload(["강아지 산책"], now);

    expect(parseRecentSearches(JSON.stringify(payload), now)).toEqual(["강아지 산책"]);
    expect(parseRecentSearches(JSON.stringify(payload), new Date("2026-05-19T00:00:00.000Z"))).toEqual([]);
  });

  it("filters sensitive terms from legacy array payloads", () => {
    expect(parseRecentSearches(JSON.stringify(["강아지 산책", "test@example.com"]), now)).toEqual([
      "강아지 산책",
    ]);
  });
});
