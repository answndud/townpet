import { describe, expect, it, vi } from "vitest";

import { logger, redactLogValue, serializeError } from "@/server/logger";

describe("logger redaction", () => {
  it("redacts sensitive keys, PII keys, bearer tokens, and query secrets", () => {
    expect(
      redactLogValue({
        authorization: "Bearer super-secret",
        email: "user@example.com",
        nested: "https://townpet.dev/reset?token=reset-secret",
        safe: "request failed",
      }),
    ).toEqual({
      authorization: "[REDACTED]",
      email: "[REDACTED_PII]",
      nested: "https://townpet.dev/reset?token=[REDACTED]",
      safe: "request failed",
    });
  });

  it("redacts secrets from serialized errors", () => {
    const serialized = serializeError(
      new Error("Authorization: Bearer token-value at postgres://user:pass@db.example/townpet"),
    );

    expect(serialized.message).not.toContain("token-value");
    expect(serialized.message).not.toContain("postgres://user:pass@db.example/townpet");
  });

  it("redacts logger output before writing JSON", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    logger.warn("email delivery failed", {
      authorization: "Bearer token-value",
      email: "user@example.com",
    });

    expect(spy).toHaveBeenCalledOnce();
    const output = String(spy.mock.calls[0]?.[0]);
    expect(output).not.toContain("token-value");
    expect(output).not.toContain("user@example.com");
    spy.mockRestore();
  });
});
