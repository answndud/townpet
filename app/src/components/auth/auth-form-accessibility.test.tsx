import { readFileSync } from "node:fs";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { SetPasswordForm } from "@/components/auth/set-password-form";

describe("auth form accessibility", () => {
  it("keeps password recovery actions mobile-safe", () => {
    const setPasswordHtml = renderToStaticMarkup(<SetPasswordForm hasPassword />);
    const resetPasswordHtml = renderToStaticMarkup(<ResetPasswordForm />);

    expect(setPasswordHtml).toContain("비밀번호를 잊었다면");
    expect(setPasswordHtml).toContain("이메일로 초기화");
    expect(setPasswordHtml).toContain("min-h-11");

    expect(resetPasswordHtml).toContain("토큰 발급");
    expect(resetPasswordHtml).toContain("비밀번호 재설정");
    expect(resetPasswordHtml).toContain("min-h-11");
  });

  it("keeps success recovery links at the 40px touch target baseline", () => {
    const setPasswordSource = readFileSync(
      join(process.cwd(), "src/components/auth/set-password-form.tsx"),
      "utf8",
    );
    const resetPasswordSource = readFileSync(
      join(process.cwd(), "src/components/auth/reset-password-form.tsx"),
      "utf8",
    );

    expect(setPasswordSource).toContain("inline-flex min-h-10 items-center");
    expect(resetPasswordSource).toContain("inline-flex min-h-10 items-center");
  });
});
