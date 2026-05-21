import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { OnboardingForm } from "@/components/onboarding/onboarding-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
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

  it("links selected primary neighborhood to its dynamic town hub", () => {
    const html = renderToStaticMarkup(
      <OnboardingForm
        email="user@townpet.test"
        nickname={null}
        bio={null}
        selectedNeighborhoods={[
          {
            id: "neighborhood-1",
            name: "강남구",
            city: "서울특별시",
            district: "강남구",
          },
        ]}
        primaryNeighborhoodId="neighborhood-1"
      />,
    );

    expect(html).toContain("선택 동네 허브 미리보기");
    expect(html).toContain(
      'href="/towns/%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C--%EA%B0%95%EB%82%A8%EA%B5%AC"',
    );
  });
});
