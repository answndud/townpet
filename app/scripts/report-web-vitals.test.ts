import { describe, expect, it } from "vitest";

import {
  parsePositiveIntegerEnv,
  resolveWebVitalsReportOptions,
} from "./report-web-vitals";

describe("web vitals report env parsing", () => {
  it("uses default report window options when env is empty", () => {
    expect(resolveWebVitalsReportOptions({})).toEqual({
      days: 7,
      limit: 5000,
    });
  });

  it("parses explicit positive integer options", () => {
    expect(
      resolveWebVitalsReportOptions({
        WEB_VITALS_REPORT_DAYS: "14",
        WEB_VITALS_REPORT_LIMIT: "1000",
      }),
    ).toEqual({
      days: 14,
      limit: 1000,
    });
  });

  it("rejects non-positive values", () => {
    expect(() => parsePositiveIntegerEnv("WEB_VITALS_REPORT_DAYS", "0", 7)).toThrow(
      "WEB_VITALS_REPORT_DAYS must be a positive integer. received=0",
    );
    expect(() => parsePositiveIntegerEnv("WEB_VITALS_REPORT_LIMIT", "-1", 5000)).toThrow(
      "WEB_VITALS_REPORT_LIMIT must be a positive integer. received=-1",
    );
  });

  it("rejects non-integer values", () => {
    expect(() => parsePositiveIntegerEnv("WEB_VITALS_REPORT_DAYS", "1.5", 7)).toThrow(
      "WEB_VITALS_REPORT_DAYS must be a positive integer. received=1.5",
    );
    expect(() => parsePositiveIntegerEnv("WEB_VITALS_REPORT_LIMIT", "many", 5000)).toThrow(
      "WEB_VITALS_REPORT_LIMIT must be a positive integer. received=many",
    );
  });
});
