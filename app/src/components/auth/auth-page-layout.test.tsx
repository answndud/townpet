import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AuthPageLayout } from "@/components/auth/auth-page-layout";

describe("AuthPageLayout", () => {
  it("uses compact mobile-safe surfaces for auth pages", () => {
    const html = renderToStaticMarkup(
      <AuthPageLayout
        eyebrow="로그인"
        title="TownPet 로그인"
        description="계정에 로그인합니다."
        form={<form><input name="email" /></form>}
        primaryFooterLink={{ href: "/register", label: "회원가입" }}
        secondaryFooterLinks={[{ href: "/password/reset", label: "비밀번호 재설정" }]}
      />,
    );

    expect(html).toContain("tp-page-bg");
    expect(html).toContain("border-y border-[#dbe6f5] bg-[#fbfdff]");
    expect(html).toContain("border-y border-[#dbe6f5] bg-white");
    expect(html).toContain("tp-text-link inline-flex min-h-10");
    expect(html).toContain("tp-text-muted inline-flex min-h-9");
    expect(html).toContain("hover:underline hover:underline-offset-4");
    expect(html).not.toContain("tp-btn-soft");
    expect(html).not.toContain("tp-hero");
    expect(html).not.toContain("tp-card");
  });
});
