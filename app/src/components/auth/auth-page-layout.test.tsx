import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AuthPageLayout } from "@/components/auth/auth-page-layout";

describe("AuthPageLayout", () => {
  it("uses shared hero and card surfaces for auth pages", () => {
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
    expect(html).toContain("tp-hero");
    expect(html).toContain("tp-card");
    expect(html).toContain("tp-btn-soft tp-btn-sm");
  });
});
