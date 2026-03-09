import { describe, expect, it } from "vitest";

import {
  formatKoreanDate,
  formatKoreanDateTime,
  formatKoreanMonthDay,
} from "@/lib/date-format";

describe("date-format", () => {
  it("formats full dates in a deterministic Korea timezone string", () => {
    expect(formatKoreanDate("2026-03-09T01:05:00.000Z")).toBe("2026.03.09");
  });

  it("formats month/day labels for compact list rows", () => {
    expect(formatKoreanMonthDay("2026-03-09T01:05:00.000Z")).toBe("3.9");
  });

  it("formats date time strings without locale-specific punctuation drift", () => {
    expect(formatKoreanDateTime("2026-03-09T01:05:00.000Z")).toBe("2026.03.09 10:05");
  });

  it("returns empty strings for invalid dates", () => {
    expect(formatKoreanDate("bad-date")).toBe("");
    expect(formatKoreanMonthDay("bad-date")).toBe("");
    expect(formatKoreanDateTime("bad-date")).toBe("");
  });
});
