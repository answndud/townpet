import { describe, expect, it } from "vitest";

import {
  parseDsn,
  parseSentrySmokeTimeout,
  requiredEnv,
  resolveApiHostFromIngestHost,
} from "./check-sentry-ingestion";

describe("sentry ingestion helper", () => {
  it("resolves Sentry SaaS ingest hosts to the Sentry API host", () => {
    expect(resolveApiHostFromIngestHost("https://o123456.ingest.sentry.io")).toBe(
      "https://sentry.io",
    );
    expect(resolveApiHostFromIngestHost("https://sentry.self-hosted.example")).toBe(
      "https://sentry.self-hosted.example",
    );
  });

  it("parses DSN project and public key", () => {
    expect(parseDsn("https://public-key@o123456.ingest.sentry.io/789")).toEqual({
      ingestHost: "https://o123456.ingest.sentry.io",
      apiHost: "https://sentry.io",
      projectId: "789",
      publicKey: "public-key",
    });
  });

  it("rejects DSNs without project id or public key", () => {
    expect(() => parseDsn("https://o123456.ingest.sentry.io/789")).toThrow(
      "Invalid SENTRY_DSN",
    );
    expect(() => parseDsn("https://public-key@o123456.ingest.sentry.io/")).toThrow(
      "Invalid SENTRY_DSN",
    );
  });

  it("validates timeout values before network calls", () => {
    expect(parseSentrySmokeTimeout(undefined)).toBe(90000);
    expect(parseSentrySmokeTimeout("1500")).toBe(1500);
    expect(() => parseSentrySmokeTimeout("0")).toThrow(
      "SENTRY_SMOKE_TIMEOUT_MS must be a positive number",
    );
    expect(() => parseSentrySmokeTimeout("not-a-number")).toThrow(
      "SENTRY_SMOKE_TIMEOUT_MS must be a positive number",
    );
  });

  it("fails fast when required environment values are missing", () => {
    const originalValue = process.env.SENTRY_AUTH_TOKEN;
    delete process.env.SENTRY_AUTH_TOKEN;
    try {
      expect(() => requiredEnv("SENTRY_AUTH_TOKEN")).toThrow(
        "SENTRY_AUTH_TOKEN is required",
      );
    } finally {
      if (originalValue === undefined) {
        delete process.env.SENTRY_AUTH_TOKEN;
      } else {
        process.env.SENTRY_AUTH_TOKEN = originalValue;
      }
    }
  });
});
