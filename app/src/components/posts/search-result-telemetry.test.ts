import { describe, expect, it } from "vitest";

import { buildSearchResultTelemetryPayload } from "@/components/posts/search-result-telemetry";

describe("buildSearchResultTelemetryPayload", () => {
  it("omits null optional values so the telemetry route accepts guest search payloads", () => {
    expect(
      buildSearchResultTelemetryPayload({
        query: " 강아지  산책 ",
        resultCount: 0,
        scope: "GLOBAL",
        type: null,
        searchIn: "ALL",
      }),
    ).toEqual({
      q: "강아지 산책",
      stage: "RESULT",
      resultCount: 0,
      scope: "GLOBAL",
      searchIn: "ALL",
    });
  });

  it("clamps resultCount to the API contract", () => {
    expect(
      buildSearchResultTelemetryPayload({
        query: "노령견",
        resultCount: 999,
        scope: "LOCAL",
        type: "HOSPITAL_REVIEW",
      })?.resultCount,
    ).toBe(500);
  });
});
