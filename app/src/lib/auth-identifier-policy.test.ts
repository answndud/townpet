import { describe, expect, it } from "vitest";

import {
  RESERVED_AUTH_EMAIL_MESSAGE,
  isReservedAuthEmail,
} from "@/lib/auth-identifier-policy";

describe("auth identifier policy", () => {
  it("blocks representative operator email aliases", () => {
    expect(isReservedAuthEmail("admin@gmail.com")).toBe(true);
    expect(isReservedAuthEmail("support@outlook.com")).toBe(true);
    expect(isReservedAuthEmail("a.d_m-in+townpet@gmail.com")).toBe(true);
  });

  it("allows ordinary personal emails", () => {
    expect(isReservedAuthEmail("admin1@gmail.com")).toBe(false);
    expect(isReservedAuthEmail("myadmin@gmail.com")).toBe(false);
    expect(isReservedAuthEmail("user@townpet.dev")).toBe(false);
  });

  it("exports a user-facing rejection message", () => {
    expect(RESERVED_AUTH_EMAIL_MESSAGE).toContain("개인 이메일");
  });
});
