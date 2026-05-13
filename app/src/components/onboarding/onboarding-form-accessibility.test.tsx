import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { OnboardingForm } from "@/components/onboarding/onboarding-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/server/actions/user", () => ({
  setPrimaryNeighborhoodAction: vi.fn(),
  updateProfileAction: vi.fn(),
}));

describe("OnboardingForm accessibility", () => {
  it("keeps onboarding actions mobile-safe", () => {
    const html = renderToStaticMarkup(
      <OnboardingForm
        email="user@townpet.test"
        nickname={null}
        bio={null}
        selectedNeighborhoods={[]}
        primaryNeighborhoodId={null}
      />,
    );

    expect(html).toContain("min-h-10");
    expect(html).toContain("닉네임 저장");
    expect(html).toContain("동네 저장");
    expect(html).toContain("나중에 설정하기");
  });
});
