import { describe, expect, it } from "vitest";

import { assessAuthEmailReadiness } from "../src/server/auth-email-readiness";
import {
  formatAuthEmailReadinessReport,
  resolveAuthEmailReadinessSampleLimit,
} from "./check-auth-email-readiness";

describe("auth email readiness CLI wrapper", () => {
  it("resolves invalid sample limits to the default", () => {
    expect(resolveAuthEmailReadinessSampleLimit(undefined)).toBe(10);
    expect(resolveAuthEmailReadinessSampleLimit("0")).toBe(10);
    expect(resolveAuthEmailReadinessSampleLimit("nope")).toBe(10);
    expect(resolveAuthEmailReadinessSampleLimit("2.9")).toBe(2);
  });

  it("formats an all-pass readiness report", () => {
    const report = assessAuthEmailReadiness({
      users: [{ id: "user-1", email: "user@townpet.dev" }],
      verificationTokens: [{ token: "token-1", identifier: "verify@townpet.dev" }],
    });

    expect(formatAuthEmailReadinessReport(report, 10)).toBe(
      [
        "Auth email readiness preflight",
        "- users: 1",
        "- verificationTokens: 1",
        "- [PASS] USER_EMAIL_CASE_INSENSITIVE_DUPLICATES: 충돌 없음",
        "- [PASS] USER_EMAIL_INVALID_ROWS: 유효하지 않은 user email 없음",
        "- [PASS] USER_EMAIL_NORMALIZATION_DRIFT: 재기록 대상 없음",
        "- [PASS] VERIFICATION_IDENTIFIER_NORMALIZATION_DRIFT: 재기록 대상 없음",
        "- [PASS] VERIFICATION_IDENTIFIER_INVALID_ROWS: 유효하지 않은 verification identifier 없음",
        "- summary: pass=5, warn=0, fail=0",
      ].join("\n"),
    );
  });

  it("formats fail and warn samples using the configured sample limit", () => {
    const report = assessAuthEmailReadiness({
      users: [
        { id: "user-1", email: "User@TownPet.dev" },
        { id: "user-2", email: " user@townpet.dev " },
        { id: "user-3", email: "not-an-email" },
      ],
      verificationTokens: [
        { token: "token-1", identifier: " Verify@TownPet.dev " },
        { token: "token-2", identifier: "not-a-token-email" },
      ],
    });

    expect(formatAuthEmailReadinessReport(report, 1)).toBe(
      [
        "Auth email readiness preflight",
        "- users: 3",
        "- verificationTokens: 2",
        "- [FAIL] USER_EMAIL_CASE_INSENSITIVE_DUPLICATES: 1개 normalized email group이 충돌합니다.",
        "  duplicate groups (showing up to 1):",
        '  - user@townpet.dev -> user-1:"User@TownPet.dev", user-2:" user@townpet.dev "',
        "- [FAIL] USER_EMAIL_INVALID_ROWS: 1개 user email이 정규화 후에도 유효한 이메일 형식이 아닙니다.",
        "  invalid user emails (showing up to 1):",
        '  - user-3 current="not-an-email" normalized="not-an-email"',
        "- [WARN] USER_EMAIL_NORMALIZATION_DRIFT: 2개 user email이 trim+lowercase로 재기록됩니다.",
        "  user email drift (showing up to 1):",
        '  - user-1 current="User@TownPet.dev" normalized="user@townpet.dev"',
        "- [WARN] VERIFICATION_IDENTIFIER_NORMALIZATION_DRIFT: 1개 verification identifier가 trim+lowercase로 재기록됩니다.",
        "  verification identifier drift (showing up to 1):",
        '  - token-1 current=" Verify@TownPet.dev " normalized="verify@townpet.dev"',
        "- [WARN] VERIFICATION_IDENTIFIER_INVALID_ROWS: 1개 verification identifier가 정규화 후에도 유효한 이메일 형식이 아닙니다.",
        "  invalid verification identifiers (showing up to 1):",
        '  - token-2 current="not-a-token-email" normalized="not-a-token-email"',
        "- summary: pass=0, warn=3, fail=2",
      ].join("\n"),
    );
  });
});
